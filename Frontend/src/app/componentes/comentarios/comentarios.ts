import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { ComentariosService } from '../../services/comentarios';
import { ModalService } from '../../services/modal';
import { Comentario } from '../../models/comentario';
import { mensajeDeError } from '../../utils/mensaje-error';
import { sinSoloEspaciosValidator } from '../../utils/sin-espacios-validator';
import { InicialesPipe } from '../../pipes/iniciales-pipe';

// Misma regla que CrearComentarioDto / ActualizarComentarioDto del back.
const MAXIMO_CARACTERES = 500;

function nuevoControlMensaje(valor = ''): FormControl<string> {
  return new FormControl(valor, {
    nonNullable: true,
    validators: [
      Validators.required,
      sinSoloEspaciosValidator(),
      Validators.maxLength(MAXIMO_CARACTERES),
    ],
  });
}

@Component({
  selector: 'app-comentarios',
  imports: [DatePipe, ReactiveFormsModule, InicialesPipe],
  templateUrl: './comentarios.html',
  styleUrl: './comentarios.css',
})
export class Comentarios implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly comentariosService = inject(ComentariosService);
  private readonly modalService = inject(ModalService);

  readonly publicacionId = input.required<string>();
  // Cuántos comentarios (los más recientes) se traen en cada carga.
  readonly limite = input(5);
  // En Mi perfil se muestra solo para leer; en el detalle se puede comentar,
  // "cargar más" y editar los propios.
  readonly interactivo = input(false);

  protected readonly maximoCaracteres = MAXIMO_CARACTERES;
  protected readonly comentarios = signal<Comentario[]>([]);
  protected readonly total = signal(0);
  protected readonly cargando = signal(true);
  protected readonly falloCarga = signal(false);
  protected readonly cargandoMas = signal(false);
  protected readonly enviando = signal(false);

  protected readonly nuevo = nuevoControlMensaje();
  protected readonly edicion = nuevoControlMensaje();
  protected readonly editandoId = signal<string | null>(null);
  protected readonly guardando = signal(false);

  protected readonly ocultos = computed(() => Math.max(0, this.total() - this.comentarios().length));
  private readonly usuarioId = computed(() => this.authService.usuarioActual()?.id ?? null);

  ngOnInit(): void {
    this.cargar();
  }

  protected esMio(comentario: Comentario): boolean {
    return comentario.autor.id === this.usuarioId();
  }

  private cargar(): void {
    this.comentariosService.listar(this.publicacionId(), 0, this.limite()).subscribe({
      next: ({ total, comentarios }) => {
        this.comentarios.set(comentarios);
        this.total.set(total);
        this.cargando.set(false);
      },
      error: () => {
        this.falloCarga.set(true);
        this.cargando.set(false);
      },
    });
  }

  // Trae los siguientes y los suma a los que ya están (no los reemplaza).
  protected cargarMas(): void {
    this.cargandoMas.set(true);
    this.comentariosService
      .listar(this.publicacionId(), this.comentarios().length, this.limite())
      .subscribe({
        next: ({ total, comentarios }) => {
          // Si alguien comentó mientras tanto, la página puede repetir alguno: se descarta.
          const yaMostrados = new Set(this.comentarios().map((c) => c.id));
          const nuevos = comentarios.filter((c) => !yaMostrados.has(c.id));
          this.comentarios.update((lista) => [...lista, ...nuevos]);
          this.total.set(total);
          this.cargandoMas.set(false);
        },
        error: (error) => {
          this.cargandoMas.set(false);
          this.modalService.error(
            mensajeDeError(error, 'No pudimos cargar más comentarios. Intentá de nuevo.'),
          );
        },
      });
  }

  protected comentar(): void {
    if (this.nuevo.invalid) {
      this.nuevo.markAsTouched();
      return;
    }

    this.enviando.set(true);
    this.comentariosService.crear(this.publicacionId(), this.nuevo.value.trim()).subscribe({
      next: (comentario) => {
        // Es el más reciente, así que va arriba.
        this.comentarios.update((lista) => [comentario, ...lista]);
        this.total.update((total) => total + 1);
        this.nuevo.reset('');
        this.enviando.set(false);
      },
      error: (error) => {
        this.enviando.set(false);
        this.modalService.error(
          mensajeDeError(error, 'No pudimos publicar tu comentario. Intentá de nuevo.'),
        );
      },
    });
  }

  protected iniciarEdicion(comentario: Comentario): void {
    this.edicion.reset(comentario.mensaje);
    this.editandoId.set(comentario.id);
  }

  protected cancelarEdicion(): void {
    this.editandoId.set(null);
  }

  protected guardarEdicion(comentario: Comentario): void {
    if (this.edicion.invalid) {
      this.edicion.markAsTouched();
      return;
    }

    const mensaje = this.edicion.value.trim();
    // Sin cambios no se llama al back: si no, quedaría marcado "editado" sin estarlo.
    if (mensaje === comentario.mensaje) {
      this.cancelarEdicion();
      return;
    }

    this.guardando.set(true);
    this.comentariosService.editar(comentario.id, mensaje).subscribe({
      next: (editado) => {
        this.comentarios.update((lista) => lista.map((c) => (c.id === editado.id ? editado : c)));
        this.guardando.set(false);
        this.cancelarEdicion();
      },
      error: (error) => {
        this.guardando.set(false);
        this.modalService.error(
          mensajeDeError(error, 'No pudimos guardar los cambios. Intentá de nuevo.'),
        );
      },
    });
  }
}
