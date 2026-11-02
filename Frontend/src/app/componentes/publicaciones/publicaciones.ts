import { Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../services/auth';
import { ModalService } from '../../services/modal';
import { PublicacionesService } from '../../services/publicaciones';
import { mensajeDeError } from '../../utils/mensaje-error';
import { OrdenPublicaciones, Publicacion } from '../../models/publicacion';
import { PublicacionCard } from '../publicacion/publicacion';
import { NuevaPublicacion } from '../nueva-publicacion/nueva-publicacion';

const PUBLICACIONES_POR_PAGINA = 5;

@Component({
  selector: 'app-publicaciones',
  imports: [PublicacionCard, NuevaPublicacion],
  templateUrl: './publicaciones.html',
  styleUrl: './publicaciones.css',
})
export class Publicaciones {
  private readonly authService = inject(AuthService);
  private readonly modalService = inject(ModalService);
  private readonly publicacionesService = inject(PublicacionesService);

  protected readonly publicaciones = signal<Publicacion[]>([]);
  protected readonly total = signal(0);
  protected readonly pagina = signal(1);
  protected readonly orden = signal<OrdenPublicaciones>('fecha');
  protected readonly cargando = signal(false);
  protected readonly creando = signal(false);

  protected readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.total() / PUBLICACIONES_POR_PAGINA)),
  );

  constructor() {
    this.cargar();
  }

  cambiarOrden(evento: Event): void {
    this.orden.set((evento.target as HTMLSelectElement).value as OrdenPublicaciones);
    this.irAPagina(1);
  }

  irAPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.cargar();
  }

  publicacionCreada(): void {
    this.creando.set(false);
    // Las nuevas aparecen primero cuando se ordena por fecha.
    this.orden.set('fecha');
    this.irAPagina(1);
  }

  alternarLike(publicacion: Publicacion): void {
    const usuario = this.authService.usuarioActual();
    if (!usuario) {
      return;
    }

    const yaDioLike = publicacion.likes.includes(usuario.id);
    const peticion = yaDioLike
      ? this.publicacionesService.quitarLike(publicacion.id, usuario.id)
      : this.publicacionesService.darLike(publicacion.id, usuario.id);

    peticion.subscribe({
      next: ({ likes, cantidadLikes }) =>
        this.publicaciones.update((lista) =>
          lista.map((p) => (p.id === publicacion.id ? { ...p, likes, cantidadLikes } : p)),
        ),
      error: (error) => {
        this.modalService.error(mensajeDeError(error, 'No pudimos actualizar tu me gusta.'));
        this.cargar();
      },
    });
  }

  eliminar(publicacion: Publicacion): void {
    const usuario = this.authService.usuarioActual();
    if (!usuario) {
      return;
    }

    this.modalService.confirmar(
      `¿Querés eliminar "${publicacion.titulo}"? Esta acción no se puede deshacer.`,
      () =>
        this.publicacionesService.eliminar(publicacion.id, usuario.id).subscribe({
          next: () => {
            // Si era la única de la última página, volvemos a la anterior.
            const quedaVacia = this.publicaciones().length === 1 && this.pagina() > 1;
            this.irAPagina(quedaVacia ? this.pagina() - 1 : this.pagina());
            this.modalService.exito('La publicación fue eliminada.', 'Publicación eliminada');
          },
          error: (error) =>
            this.modalService.error(mensajeDeError(error, 'No pudimos eliminar la publicación.')),
        }),
      'Eliminar publicación',
    );
  }

  private cargar(): void {
    this.cargando.set(true);
    this.publicacionesService
      .listar({
        orden: this.orden(),
        offset: (this.pagina() - 1) * PUBLICACIONES_POR_PAGINA,
        limit: PUBLICACIONES_POR_PAGINA,
      })
      .subscribe({
        next: ({ total, publicaciones }) => {
          this.publicaciones.set(publicaciones);
          this.total.set(total);
          this.cargando.set(false);
        },
        error: (error) => {
          this.cargando.set(false);
          this.modalService.error(mensajeDeError(error, 'No pudimos cargar las publicaciones.'));
        },
      });
  }
}
