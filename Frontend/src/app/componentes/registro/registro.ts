import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ModalService } from '../../services/modal';
import { mensajeDeError } from '../../utils/mensaje-error';
import { PerfilUsuario } from '../../models/usuario';
import { contrasenasIgualesValidator } from './contrasenas-iguales-validator';
import { sinSoloEspaciosValidator } from '../../utils/sin-espacios-validator';
import {
  FECHA_NACIMIENTO_MINIMA,
  fechaDeHoy,
  fechaNacimientoValidator,
} from '../../utils/fecha-nacimiento-validator';

// Mismas reglas que el RegistroDto del back.
const PATRON_NOMBRE = /^[\p{L}' -]+$/u;
const PATRON_NOMBRE_USUARIO = /^[A-Za-z0-9._]+$/;
const PATRON_CONTRASENA = /^(?=.*[A-Z])(?=.*\d).+$/;
const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'];
const TAMANO_MAXIMO_IMAGEN_MB = 2;

@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './registro.html',
  styleUrl: './registro.css',
})
export class Registro {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly modalService = inject(ModalService);
  private readonly router = inject(Router);

  protected readonly enviando = signal(false);
  protected readonly perfiles = [PerfilUsuario.USUARIO, PerfilUsuario.ADMINISTRADOR];
  protected readonly fechaMinima = FECHA_NACIMIENTO_MINIMA;
  protected readonly fechaMaxima = fechaDeHoy();
  protected readonly tiposImagen = TIPOS_IMAGEN.join(',');

  // La imagen es opcional y se maneja fuera del form: se envía como data URL.
  protected readonly imagenPerfil = signal<string | null>(null);
  protected readonly errorImagen = signal<string | null>(null);

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
    lector.onload = () => this.imagenPerfil.set(lector.result as string);
    lector.onerror = () => this.errorImagen.set('No pudimos leer la imagen. Probá con otra.');
    lector.readAsDataURL(archivo);
  }

  quitarImagen(input?: HTMLInputElement): void {
    this.imagenPerfil.set(null);
    this.errorImagen.set(null);
    if (input) {
      input.value = '';
    }
  }

  protected readonly form = this.fb.nonNullable.group(
    {
      nombre: [
        '',
        [
          Validators.required,
          sinSoloEspaciosValidator(),
          Validators.minLength(2),
          Validators.maxLength(50),
          Validators.pattern(PATRON_NOMBRE),
        ],
      ],
      apellido: [
        '',
        [
          Validators.required,
          sinSoloEspaciosValidator(),
          Validators.minLength(2),
          Validators.maxLength(50),
          Validators.pattern(PATRON_NOMBRE),
        ],
      ],
      correo: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      nombreUsuario: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(20),
          Validators.pattern(PATRON_NOMBRE_USUARIO),
        ],
      ],
      contrasena: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(64),
          Validators.pattern(PATRON_CONTRASENA),
        ],
      ],
      repetirContrasena: ['', [Validators.required]],
      fechaNacimiento: ['', [Validators.required, fechaNacimientoValidator()]],
      descripcion: ['', [Validators.maxLength(280)]],
      perfil: [PerfilUsuario.USUARIO, [Validators.required]],
    },
    { validators: [contrasenasIgualesValidator('contrasena', 'repetirContrasena')] },
  );

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    const payload = this.form.getRawValue();
    payload.nombre = payload.nombre.trim();
    payload.apellido = payload.apellido.trim();
    payload.correo = payload.correo.trim().toLowerCase();
    payload.nombreUsuario = payload.nombreUsuario.trim();
    payload.descripcion = payload.descripcion.trim();

    const imagenPerfil = this.imagenPerfil();

    this.authService.registro({ ...payload, ...(imagenPerfil && { imagenPerfil }) }).subscribe({
      next: () => {
        this.enviando.set(false);
        this.modalService.exito('¡Cuenta creada con éxito! Ya iniciaste sesión.');
        this.router.navigateByUrl('/publicaciones');
      },
      error: (error: unknown) => {
        this.enviando.set(false);
        this.modalService.error(
          mensajeDeError(error, 'No pudimos crear tu cuenta. Intentá nuevamente.'),
        );
      },
    });
  }
}
