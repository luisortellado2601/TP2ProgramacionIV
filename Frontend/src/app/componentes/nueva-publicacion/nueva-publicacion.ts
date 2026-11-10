import { Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalService } from '../../services/modal';
import { PublicacionesService } from '../../services/publicaciones';
import { mensajeDeError } from '../../utils/mensaje-error';
import { sinSoloEspaciosValidator } from '../../utils/sin-espacios-validator';

// Mismas reglas que el CrearPublicacionDto del back.
const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'];
const TAMANO_MAXIMO_IMAGEN_MB = 2;

@Component({
  selector: 'app-nueva-publicacion',
  imports: [ReactiveFormsModule],
  templateUrl: './nueva-publicacion.html',
  styleUrl: './nueva-publicacion.css',
})
export class NuevaPublicacion {
  private readonly fb = inject(FormBuilder);
  private readonly modalService = inject(ModalService);
  private readonly publicacionesService = inject(PublicacionesService);

  readonly creada = output<void>();
  readonly cancelada = output<void>();

  protected readonly enviando = signal(false);
  protected readonly tiposImagen = TIPOS_IMAGEN.join(',');
  protected readonly imagen = signal<string | null>(null);
  protected readonly errorImagen = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    titulo: [
      '',
      [
        Validators.required,
        sinSoloEspaciosValidator(),
        Validators.minLength(2),
        Validators.maxLength(100),
      ],
    ],
    mensaje: ['', [Validators.required, sinSoloEspaciosValidator(), Validators.maxLength(2000)]],
  });

  seleccionarImagen(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    this.quitarImagen();
    if (!archivo) {
      return;
    }
    if (!TIPOS_IMAGEN.includes(archivo.type)) {
      this.errorImagen.set('La imagen debe ser JPG, PNG o WEBP.');
      input.value = '';
      return;
    }
    if (archivo.size > TAMANO_MAXIMO_IMAGEN_MB * 1024 * 1024) {
      this.errorImagen.set(`La imagen no puede superar los ${TAMANO_MAXIMO_IMAGEN_MB} MB.`);
      input.value = '';
      return;
    }

    const lector = new FileReader();
    lector.onload = () => this.imagen.set(lector.result as string);
    lector.onerror = () => this.errorImagen.set('No pudimos leer la imagen. Probá con otra.');
    lector.readAsDataURL(archivo);
  }

  quitarImagen(input?: HTMLInputElement): void {
    this.imagen.set(null);
    this.errorImagen.set(null);
    if (input) {
      input.value = '';
    }
  }

  publicar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { titulo, mensaje } = this.form.getRawValue();
    const imagen = this.imagen();
    this.enviando.set(true);
    this.publicacionesService
      .crear({
        titulo: titulo.trim(),
        mensaje: mensaje.trim(),
        ...(imagen && { imagen }),
      })
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.modalService.exito('Tu publicación ya está en el listado.', 'Publicación creada');
          this.creada.emit();
        },
        error: (error) => {
          this.enviando.set(false);
          this.modalService.error(
            mensajeDeError(error, 'No pudimos crear la publicación. Intentá de nuevo.'),
          );
        },
      });
  }
}
