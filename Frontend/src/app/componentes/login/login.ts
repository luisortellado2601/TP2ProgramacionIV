import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ModalService } from '../../services/modal';
import { mensajeDeError } from '../../utils/mensaje-error';
import { sinSoloEspaciosValidator } from '../../utils/sin-espacios-validator';

const PATRON_CONTRASENA = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly modalService = inject(ModalService);
  private readonly router = inject(Router);

  protected readonly enviando = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    usuarioOCorreo: [
      '',
      [Validators.required, sinSoloEspaciosValidator(), Validators.maxLength(100)],
    ],
    contrasena: [
      '',
      [Validators.required, Validators.maxLength(64), Validators.pattern(PATRON_CONTRASENA)],
    ],
  });

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    const payload = this.form.getRawValue();
    payload.usuarioOCorreo = payload.usuarioOCorreo.trim();

    this.authService.login(payload).subscribe({
      next: () => {
        this.enviando.set(false);
        this.router.navigateByUrl('/publicaciones');
      },
      error: (error: unknown) => {
        this.enviando.set(false);
        this.modalService.error(
          mensajeDeError(error, 'No pudimos iniciar sesión. Intentá nuevamente.'),
        );
      },
    });
  }
}
