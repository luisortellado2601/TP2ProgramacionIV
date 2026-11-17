import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { BusquedasService } from '../../services/busquedas';
import { JuegosService } from '../../services/juegos';
import { ModalService } from '../../services/modal';
import { Busqueda, PLATAFORMAS, REGIONES } from '../../models/busqueda';
import { PerfilUsuario } from '../../models/usuario';
import { InicialesPipe } from '../../pipes/iniciales-pipe';
import { TiempoRelativoPipe } from '../../pipes/tiempo-relativo-pipe';
import { mensajeDeError } from '../../utils/mensaje-error';
import { sinSoloEspaciosValidator } from '../../utils/sin-espacios-validator';
import { Spinner } from '../spinner/spinner';

const POR_PAGINA = 10;
const MAXIMO_MENSAJE = 500;

@Component({
  selector: 'app-companeros',
  imports: [ReactiveFormsModule, InicialesPipe, TiempoRelativoPipe, Spinner],
  templateUrl: './companeros.html',
  styleUrl: './companeros.css',
})
export class Companeros {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly busquedasService = inject(BusquedasService);
  private readonly juegosService = inject(JuegosService);
  private readonly modalService = inject(ModalService);

  protected readonly juegos = this.juegosService.listar().map((juego) => juego.titulo);
  protected readonly plataformas = PLATAFORMAS;
  protected readonly regiones = REGIONES;
  protected readonly maximoMensaje = MAXIMO_MENSAJE;

  protected readonly busquedas = signal<Busqueda[]>([]);
  protected readonly total = signal(0);
  protected readonly cargando = signal(false);
  protected readonly creando = signal(false);
  protected readonly enviando = signal(false);
  protected readonly abiertas = signal<ReadonlySet<string>>(new Set());
  protected readonly enviandoMensaje = signal<string | null>(null);
  protected readonly hayMas = computed(() => this.busquedas().length < this.total());

  protected readonly filtros = this.fb.nonNullable.group({
    juego: [''],
    region: [''],
    plataforma: [''],
  });

  protected readonly form = this.fb.nonNullable.group({
    juego: ['', Validators.required],
    region: ['Sudamérica', Validators.required],
    plataforma: ['PC', Validators.required],
    descripcion: ['', [sinSoloEspaciosValidator(), Validators.maxLength(280)]],
  });

  constructor() {
    this.buscar();
  }

  protected buscar(): void {
    this.cargar(true);
  }

  protected cargar(reiniciar: boolean): void {
    const { juego, region, plataforma } = this.filtros.getRawValue();
    const offset = reiniciar ? 0 : this.busquedas().length;
    this.cargando.set(true);
    this.busquedasService
      .listar({
        juego,
        region,
        plataforma,
        offset,
        limit: POR_PAGINA,
      })
      .subscribe({
        next: ({ total, busquedas }) => {
          this.total.set(total);
          this.busquedas.update((actuales) =>
            reiniciar ? busquedas : [...actuales, ...busquedas],
          );
          this.cargando.set(false);
        },
        error: (error: unknown) => {
          this.cargando.set(false);
          this.modalService.error(
            mensajeDeError(error, 'No pudimos cargar las búsquedas. Intentá nuevamente.'),
          );
        },
      });
  }

  protected limpiarFiltros(): void {
    this.filtros.reset({ juego: '', region: '', plataforma: '' });
    this.buscar();
  }

  protected publicar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    const { descripcion, ...datos } = this.form.getRawValue();
    const detalles = descripcion.trim();
    this.busquedasService
      .crear({ ...datos, ...(detalles && { descripcion: detalles }) })
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.creando.set(false);
          this.form.reset();
          this.filtros.reset({ juego: '', region: '', plataforma: '' });
          this.modalService.exito('Tu búsqueda ya está publicada.', 'Búsqueda publicada');
          this.cargar(true);
        },
        error: (error: unknown) => {
          this.enviando.set(false);
          this.modalService.error(
            mensajeDeError(error, 'No pudimos publicar tu búsqueda. Intentá nuevamente.'),
          );
        },
      });
  }

  protected alternarContacto(busqueda: Busqueda): void {
    this.abiertas.update((actuales) => {
      const nuevas = new Set(actuales);
      if (!nuevas.delete(busqueda.id)) {
        nuevas.add(busqueda.id);
      }
      return nuevas;
    });
  }

  protected enviarMensaje(busqueda: Busqueda, caja: HTMLTextAreaElement): void {
    const mensaje = caja.value.trim();
    if (!mensaje) {
      this.modalService.error('Escribí un mensaje antes de enviarlo.', 'Mensaje vacío');
      return;
    }
    this.enviandoMensaje.set(busqueda.id);
    this.busquedasService.responder(busqueda.id, mensaje).subscribe({
      next: (respuesta) => {
        this.enviandoMensaje.set(null);
        caja.value = '';
        this.busquedas.update((actuales) =>
          actuales.map((b) =>
            b.id === busqueda.id ? { ...b, respuestas: [...b.respuestas, respuesta] } : b,
          ),
        );
      },
      error: (error: unknown) => {
        this.enviandoMensaje.set(null);
        this.modalService.error(
          mensajeDeError(error, 'No pudimos enviar tu mensaje. Intentá nuevamente.'),
        );
      },
    });
  }

  protected esMia(busqueda: Busqueda): boolean {
    return this.authService.usuarioActual()?.id === busqueda.autor.id;
  }

  protected puedeCerrar(busqueda: Busqueda): boolean {
    const usuario = this.authService.usuarioActual();
    return (
      !!usuario &&
      (usuario.id === busqueda.autor.id || usuario.perfil === PerfilUsuario.ADMINISTRADOR)
    );
  }

  protected cerrar(busqueda: Busqueda): void {
    this.modalService.confirmar(
      `¿Querés cerrar la búsqueda de ${busqueda.juego}? Dejará de aparecer en el listado.`,
      () =>
        this.busquedasService.cerrar(busqueda.id).subscribe({
          next: () => {
            this.busquedas.update((actuales) => actuales.filter((b) => b.id !== busqueda.id));
            this.total.update((total) => total - 1);
          },
          error: (error: unknown) =>
            this.modalService.error(
              mensajeDeError(error, 'No pudimos cerrar la búsqueda. Intentá nuevamente.'),
            ),
        }),
      'Cerrar búsqueda',
      false,
      { textoConfirmar: 'Cerrar', textoCancelar: 'Mantener' },
    );
  }

  protected portada(busqueda: Busqueda): string | null {
    const juego = this.juegosService
      .listar()
      .find((j) => j.titulo.toLowerCase() === busqueda.juego.toLowerCase());
    return juego ? this.juegosService.portada(juego) : null;
  }

  protected ocultarImagen(evento: Event): void {
    (evento.target as HTMLElement).hidden = true;
  }
}
