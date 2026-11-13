import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { EMPTY, Subject, catchError, debounceTime, forkJoin, switchMap, tap } from 'rxjs';
import { EstadisticasService } from '../../services/estadisticas';
import { ModalService } from '../../services/modal';
import { mensajeDeError } from '../../utils/mensaje-error';
import {
  ComentariosPorPublicacion,
  PublicacionesPorUsuario,
  RangoFechas,
  RespuestaComentarios,
} from '../../models/estadisticas';
import { Grafico } from '../grafico/grafico';
import { Spinner } from '../spinner/spinner';

const LARGO_MAXIMO_TITULO = 24;
const TIEMPO_ESPERA_MS = 300;

// Fecha de hoy como "YYYY-MM-DD", en la zona horaria del usuario (el formato de los campos de fecha).
function hoy(): string {
  const fecha = new Date();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

// "2026-11-05" -> "05/11". Se arma con texto (sin `Date`) para que la zona horaria no mueva el día.
function formatearDia(fecha: string): string {
  const [, mes, dia] = fecha.split('-');
  return `${dia}/${mes}`;
}

function acortar(texto: string): string {
  return texto.length > LARGO_MAXIMO_TITULO ? `${texto.slice(0, LARGO_MAXIMO_TITULO - 1)}…` : texto;
}

@Component({
  selector: 'app-admin-estadisticas',
  imports: [ReactiveFormsModule, Grafico, Spinner],
  templateUrl: './admin-estadisticas.html',
  styleUrl: './admin-estadisticas.css',
})
export class AdminEstadisticas {
  private readonly estadisticasService = inject(EstadisticasService);
  private readonly modalService = inject(ModalService);

  // Lapso elegible: sin fechas es "todo el tiempo"; con una sola, queda abierto del otro lado.
  protected readonly lapso = new FormGroup({
    desde: new FormControl('', { nonNullable: true }),
    hasta: new FormControl('', { nonNullable: true }),
  });

  protected readonly cargando = signal(true);
  protected readonly falloCarga = signal(false);
  protected readonly publicacionesPorUsuario = signal<PublicacionesPorUsuario[]>([]);
  protected readonly comentarios = signal<RespuestaComentarios>({ total: 0, porDia: [] });
  protected readonly comentariosPorPublicacion = signal<ComentariosPorPublicacion[]>([]);

  // Etiquetas y valores que consume cada gráfico.
  protected readonly usuariosEtiquetas = computed(() =>
    this.publicacionesPorUsuario().map((u) => `@${u.nombreUsuario}`),
  );
  protected readonly usuariosValores = computed(() =>
    this.publicacionesPorUsuario().map((u) => u.cantidad),
  );
  protected readonly diasEtiquetas = computed(() =>
    this.comentarios().porDia.map((d) => formatearDia(d.fecha)),
  );
  protected readonly diasValores = computed(() => this.comentarios().porDia.map((d) => d.cantidad));
  protected readonly publicacionesEtiquetas = computed(() =>
    this.comentariosPorPublicacion().map((p) => acortar(p.titulo)),
  );
  protected readonly publicacionesValores = computed(() =>
    this.comentariosPorPublicacion().map((p) => p.cantidad),
  );

  // Cada lapso a consultar entra por acá; `switchMap` descarta el pedido anterior si todavía no
  // terminó, así que un cambio rápido de fechas nunca deja datos viejos en pantalla.
  private readonly pedidos = new Subject<RangoFechas>();

  constructor() {
    this.pedidos
      .pipe(
        tap(() => {
          this.cargando.set(true);
          this.falloCarga.set(false);
        }),
        // Los tres pedidos van juntos con el mismo lapso, para que los gráficos sean comparables.
        switchMap((rango) =>
          forkJoin({
            porUsuario: this.estadisticasService.publicacionesPorUsuario(rango),
            comentarios: this.estadisticasService.comentarios(rango),
            porPublicacion: this.estadisticasService.comentariosPorPublicacion(rango),
          }).pipe(
            catchError((error) => {
              this.falloCarga.set(true);
              this.cargando.set(false);
              this.modalService.error(mensajeDeError(error, 'No pudimos cargar las estadísticas.'));
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ porUsuario, comentarios, porPublicacion }) => {
        this.publicacionesPorUsuario.set(porUsuario);
        this.comentarios.set(comentarios);
        this.comentariosPorPublicacion.set(porPublicacion);
        this.cargando.set(false);
      });

    // Las fechas se aplican solas al elegirlas. El pequeño retraso evita un pedido por cada
    // dígito mientras se escribe una fecha a mano.
    this.lapso.valueChanges
      .pipe(debounceTime(TIEMPO_ESPERA_MS), takeUntilDestroyed())
      .subscribe(() => this.consultar());

    this.consultar();
  }

  protected get hayLapso(): boolean {
    const { desde, hasta } = this.lapso.getRawValue();
    return !!desde || !!hasta;
  }

  // El navegador solo abre el calendario desde su ícono; así se abre con un clic en cualquier parte
  // del campo. Si el navegador no lo permite, queda el ícono y el teclado.
  protected abrirCalendario(evento: Event): void {
    try {
      (evento.target as HTMLInputElement).showPicker?.();
    } catch {
      // showPicker puede rechazarse (p. ej. si ya está abierto); no es un error para el usuario.
    }
  }

  protected limpiar(): void {
    this.lapso.reset();
  }

  // Fecha más tardía que se puede elegir: hoy. Se calcula en cada uso para que, si la pantalla
  // queda abierta pasada la medianoche, el límite se actualice solo.
  protected get fechaMaxima(): string {
    return hoy();
  }

  // "Desde" no puede pasar de "hasta" (si ya hay una) ni de hoy.
  protected get desdeMaximo(): string {
    const { hasta } = this.lapso.getRawValue();
    return hasta && hasta < hoy() ? hasta : hoy();
  }

  // Para marcar en rojo el campo (o los campos) del lapso que no es válido.
  protected invalido(campo: 'desde' | 'hasta'): boolean {
    return this.errorDelLapso()?.campos.includes(campo) ?? false;
  }

  // Reglas del lapso, en orden: no se puede pedir un reporte de fechas que todavía no llegaron,
  // y el comienzo no puede ser posterior al final.
  private errorDelLapso(): { campos: ('desde' | 'hasta')[]; mensaje: string } | null {
    const { desde, hasta } = this.lapso.getRawValue();
    const hoyTexto = hoy();
    if (hasta && hasta > hoyTexto) {
      return { campos: ['hasta'], mensaje: 'La fecha "hasta" no puede ser posterior a hoy.' };
    }
    if (desde && desde > hoyTexto) {
      return { campos: ['desde'], mensaje: 'La fecha "desde" no puede ser posterior a hoy.' };
    }
    if (desde && hasta && desde > hasta) {
      return {
        campos: ['desde', 'hasta'],
        mensaje: 'La fecha "desde" no puede ser posterior a la fecha "hasta".',
      };
    }
    return null;
  }

  private consultar(): void {
    const error = this.errorDelLapso();
    if (error) {
      this.modalService.error(error.mensaje);
      return;
    }
    const { desde, hasta } = this.lapso.getRawValue();
    this.pedidos.next({ desde: desde || undefined, hasta: hasta || undefined });
  }
}
