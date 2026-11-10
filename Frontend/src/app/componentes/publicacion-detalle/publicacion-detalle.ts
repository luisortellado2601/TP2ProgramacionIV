import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ModalService } from '../../services/modal';
import { PublicacionesService } from '../../services/publicaciones';
import { Publicacion } from '../../models/publicacion';
import { mensajeDeError } from '../../utils/mensaje-error';
import { PublicacionCard } from '../publicacion/publicacion';
import { Comentarios } from '../comentarios/comentarios';

// Comentarios que se traen en la primera carga y en cada "cargar más".
const COMENTARIOS_POR_CARGA = 5;

@Component({
  selector: 'app-publicacion-detalle',
  imports: [RouterLink, PublicacionCard, Comentarios],
  templateUrl: './publicacion-detalle.html',
  styleUrl: './publicacion-detalle.css',
})
export class PublicacionDetalle {
  private readonly authService = inject(AuthService);
  private readonly modalService = inject(ModalService);
  private readonly publicacionesService = inject(PublicacionesService);
  private readonly router = inject(Router);

  protected readonly comentariosPorCarga = COMENTARIOS_POR_CARGA;
  protected readonly publicacion = signal<Publicacion | null>(null);
  protected readonly cargando = signal(true);
  // 'noExiste' cubre el 404 (inexistente o dada de baja) y el 400 (id mal formado).
  protected readonly error = signal<'noExiste' | 'falla' | null>(null);

  constructor() {
    const id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
    this.publicacionesService.obtener(id).subscribe({
      next: (publicacion) => {
        this.publicacion.set(publicacion);
        this.cargando.set(false);
      },
      error: (error: unknown) => {
        const noExiste =
          error instanceof HttpErrorResponse && (error.status === 404 || error.status === 400);
        this.error.set(noExiste ? 'noExiste' : 'falla');
        this.cargando.set(false);
      },
    });
  }

  alternarLike(publicacion: Publicacion): void {
    const usuario = this.authService.usuarioActual();
    if (!usuario) {
      return;
    }

    const yaDioLike = publicacion.likes.includes(usuario.id);
    const peticion = yaDioLike
      ? this.publicacionesService.quitarLike(publicacion.id)
      : this.publicacionesService.darLike(publicacion.id);

    peticion.subscribe({
      next: ({ likes, cantidadLikes }) =>
        this.publicacion.update((actual) => (actual ? { ...actual, likes, cantidadLikes } : actual)),
      error: (error) =>
        this.modalService.error(mensajeDeError(error, 'No pudimos actualizar tu me gusta.')),
    });
  }

  eliminar(publicacion: Publicacion): void {
    this.modalService.confirmar(
      `¿Querés eliminar "${publicacion.titulo}"? Esta acción no se puede deshacer.`,
      () =>
        this.publicacionesService.eliminar(publicacion.id).subscribe({
          next: () => {
            void this.router.navigateByUrl('/publicaciones');
            this.modalService.exito('La publicación fue eliminada.', 'Publicación eliminada');
          },
          error: (error) =>
            this.modalService.error(
              mensajeDeError(error, 'No pudimos eliminar la publicación. Intentá de nuevo.'),
            ),
        }),
    );
  }
}
