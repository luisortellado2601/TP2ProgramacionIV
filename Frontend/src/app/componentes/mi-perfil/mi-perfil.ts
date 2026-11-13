import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { PublicacionesService } from '../../services/publicaciones';
import { Publicacion } from '../../models/publicacion';
import { PublicacionCard } from '../publicacion/publicacion';
import { Comentarios } from '../comentarios/comentarios';
import { InicialesPipe } from '../../pipes/iniciales-pipe';
import { Spinner } from '../spinner/spinner';

const CANTIDAD_ULTIMAS = 3;
// Comentarios que se ven de cada publicación (los más recientes); el resto, con "Ver N más".
const COMENTARIOS_POR_PUBLICACION = 3;

@Component({
  selector: 'app-mi-perfil',
  imports: [RouterLink, PublicacionCard, Comentarios, InicialesPipe, Spinner],
  templateUrl: './mi-perfil.html',
  styleUrl: './mi-perfil.css',
})
export class MiPerfil {
  protected readonly authService = inject(AuthService);
  private readonly publicacionesService = inject(PublicacionesService);

  protected readonly comentariosPorPublicacion = COMENTARIOS_POR_PUBLICACION;
  protected readonly ultimas = signal<Publicacion[]>([]);
  protected readonly cargando = signal(true);
  protected readonly falloCarga = signal(false);

  constructor() {
    const usuario = this.authService.usuarioActual();
    if (!usuario) {
      return;
    }
    this.publicacionesService
      .listar({ orden: 'fecha', offset: 0, limit: CANTIDAD_ULTIMAS, usuario: usuario.id })
      .subscribe({
        next: ({ publicaciones }) => {
          this.ultimas.set(publicaciones);
          this.cargando.set(false);
        },
        error: () => {
          this.falloCarga.set(true);
          this.cargando.set(false);
        },
      });
  }
}
