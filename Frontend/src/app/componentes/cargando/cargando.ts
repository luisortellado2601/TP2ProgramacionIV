import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ModalService } from '../../services/modal';
import { mensajeDeError } from '../../utils/mensaje-error';
import { Spinner } from '../spinner/spinner';

@Component({
  selector: 'app-cargando',
  imports: [Spinner],
  templateUrl: './cargando.html',
  styleUrl: './cargando.css',
})
export class Cargando implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly modalService = inject(ModalService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    if (!this.authService.estaAutenticado()) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.authService.autorizar().subscribe({
      next: () => this.router.navigateByUrl('/publicaciones'),
      error: (error: unknown) => {
        // Un 401 ya lo maneja el interceptor (cierra sesión y redirige); esto
        // cubre lo demás (por ejemplo, el back caído).
        this.modalService.error(
          mensajeDeError(error, 'No pudimos validar tu sesión. Iniciá sesión nuevamente.'),
        );
        this.router.navigateByUrl('/login');
      },
    });
  }
}
