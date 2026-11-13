import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ModalService } from '../../services/modal';
import { mensajeDeError } from '../../utils/mensaje-error';
import { sinSoloEspaciosValidator } from '../../utils/sin-espacios-validator';
import {
  FECHA_NACIMIENTO_MINIMA,
  fechaDeHoy,
  fechaNacimientoValidator,
} from '../../utils/fecha-nacimiento-validator';
import { ActualizarPerfilPayload } from '../../models/usuario';
import { ContadorCaracteresDirective } from '../../directives/contador-caracteres-directive';
import { InicialesPipe } from '../../pipes/iniciales-pipe';

// Mismas reglas que el ActualizarPerfilDto del back (que repite las del registro).
const PATRON_NOMBRE = /^[\p{L}' -]+$/u;
const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'];
const TAMANO_MAXIMO_IMAGEN_MB = 2;

@Component({
  selector: 'app-editar-perfil',
  imports: [ReactiveFormsModule, RouterLink, ContadorCaracteresDirective, InicialesPipe],
  templateUrl: './editar-perfil.html',
  styleUrl: './editar-perfil.css',
})
export class EditarPerfil {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly modalService = inject(ModalService);
  private readonly router = inject(Router);

  // Datos de la sesión: sirven para completar el formulario y para saber si hubo cambios.
  protected readonly usuario = this.authService.usuarioActual;
  private readonly original = {
    nombre: this.usuario()?.nombre ?? '',
    apellido: this.usuario()?.apellido ?? '',
    // Llega como medianoche UTC ("1999-05-20T00:00:00.000Z"): el día es lo que va antes de la "T".
    fechaNacimiento: (this.usuario()?.fechaNacimiento ?? '').slice(0, 10),
    descripcion: this.usuario()?.descripcion ?? '',
  };

  protected readonly enviando = signal(false);
  protected readonly fechaMinima = FECHA_NACIMIENTO_MINIMA;
  protected readonly fechaMaxima = fechaDeHoy();
  protected readonly tiposImagen = TIPOS_IMAGEN.join(',');

  // La foto nueva es opcional y se maneja fuera del form: se envía como data URL.
  protected readonly imagenNueva = signal<string | null>(null);
  protected readonly errorImagen = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    nombre: [
      this.original.nombre,
      [
        Validators.required,
        sinSoloEspaciosValidator(),
        Validators.minLength(2),
        Validators.maxLength(50),
        Validators.pattern(PATRON_NOMBRE),
      ],
    ],
    apellido: [
      this.original.apellido,
      [
        Validators.required,
        sinSoloEspaciosValidator(),
        Validators.minLength(2),
        Validators.maxLength(50),
        Validators.pattern(PATRON_NOMBRE),
      ],
    ],
    fechaNacimiento: [
      this.original.fechaNacimiento,
      [Validators.required, fechaNacimientoValidator()],
    ],
    descripcion: [this.original.descripcion, [Validators.maxLength(280)]],
  });

  // El botón "Guardar" se habilita solo si hay algo distinto de lo guardado.
  protected hayCambios(): boolean {
    const { nombre, apellido, fechaNacimiento, descripcion } = this.form.getRawValue();
    return (
      this.imagenNueva() !== null ||
      nombre.trim() !== this.original.nombre ||
      apellido.trim() !== this.original.apellido ||
      fechaNacimiento !== this.original.fechaNacimiento ||
      descripcion.trim() !== this.original.descripcion
    );
  }

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
    lector.onload = () => this.imagenNueva.set(lector.result as string);
    lector.onerror = () => this.errorImagen.set('No pudimos leer la imagen. Probá con otra.');
    lector.readAsDataURL(archivo);
  }

  quitarImagen(input?: HTMLInputElement): void {
    this.imagenNueva.set(null);
    this.errorImagen.set(null);
    if (input) {
      input.value = '';
    }
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.hayCambios()) {
      return;
    }

    this.enviando.set(true);
    const { nombre, apellido, fechaNacimiento, descripcion } = this.form.getRawValue();
    const imagenPerfil = this.imagenNueva();
    const payload: ActualizarPerfilPayload = {
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      fechaNacimiento,
      descripcion: descripcion.trim(),
      ...(imagenPerfil && { imagenPerfil }),
    };

    this.authService.actualizarPerfil(payload).subscribe({
      next: () => {
        this.enviando.set(false);
        this.modalService.exito('Tu perfil se actualizó correctamente.');
        this.router.navigateByUrl('/perfil');
      },
      error: (error: unknown) => {
        this.enviando.set(false);
        this.modalService.error(
          mensajeDeError(error, 'No pudimos actualizar tu perfil. Intentá nuevamente.'),
        );
      },
    });
  }
}
