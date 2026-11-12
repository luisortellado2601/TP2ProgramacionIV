import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ModalService } from '../../services/modal';
import { PerfilUsuario } from '../../models/usuario';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  protected readonly PerfilUsuario = PerfilUsuario;
  protected readonly authService = inject(AuthService);
  private readonly modalService = inject(ModalService);
  private readonly router = inject(Router);

  protected readonly abierto = signal(false);

  alternar(): void {
    this.abierto.update((valor) => !valor);
  }

  @HostListener('document:keydown.escape')
  cerrar(): void {
    this.abierto.set(false);
  }

  cerrarSesion(): void {
    this.cerrar();
    this.modalService.confirmar('¿Querés cerrar tu sesión?', () => {
      this.authService.logout();
      this.router.navigateByUrl('/login');
    });
  }
}
