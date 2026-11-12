import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ModalService } from '../../services/modal';
import { UsuariosService } from '../../services/usuarios';
import { mensajeDeError } from '../../utils/mensaje-error';
import { Usuario } from '../../models/usuario';

@Component({
  selector: 'app-admin-usuarios',
  imports: [DatePipe, RouterLink],
  templateUrl: './admin-usuarios.html',
  styleUrl: './admin-usuarios.css',
})
export class AdminUsuarios {
  private readonly authService = inject(AuthService);
  private readonly modalService = inject(ModalService);
  private readonly usuariosService = inject(UsuariosService);

  protected readonly usuarios = signal<Usuario[]>([]);
  protected readonly cargando = signal(true);
  protected readonly falloCarga = signal(false);
  protected readonly actualizandoId = signal<string | null>(null);

  constructor() {
    this.cargar();
  }

  protected esUsuarioActual(usuario: Usuario): boolean {
    return usuario.id === this.authService.usuarioActual()?.id;
  }

  alternarHabilitado(usuario: Usuario): void {
    if (usuario.habilitado) {
      this.modalService.confirmar(
        `¿Querés deshabilitar a @${usuario.nombreUsuario}? No va a poder iniciar sesión.`,
        () => this.cambiarHabilitado(usuario, false),
        'Deshabilitar usuario',
      );
      return;
    }
    this.cambiarHabilitado(usuario, true);
  }

  private cambiarHabilitado(usuario: Usuario, habilitado: boolean): void {
    this.actualizandoId.set(usuario.id);
    const peticion = habilitado
      ? this.usuariosService.habilitar(usuario.id)
      : this.usuariosService.deshabilitar(usuario.id);

    peticion.subscribe({
      next: (actualizado) => {
        this.actualizandoId.set(null);
        this.usuarios.update((lista) =>
          lista.map((u) => (u.id === actualizado.id ? actualizado : u)),
        );
      },
      error: (error) => {
        this.actualizandoId.set(null);
        this.modalService.error(
          mensajeDeError(error, 'No pudimos actualizar el estado del usuario.'),
        );
      },
    });
  }

  private cargar(): void {
    this.cargando.set(true);
    this.falloCarga.set(false);
    this.usuariosService.listar().subscribe({
      next: (usuarios) => {
        this.usuarios.set(usuarios);
        this.cargando.set(false);
      },
      error: (error) => {
        this.falloCarga.set(true);
        this.cargando.set(false);
        this.modalService.error(mensajeDeError(error, 'No pudimos cargar los usuarios.'));
      },
    });
  }
}
