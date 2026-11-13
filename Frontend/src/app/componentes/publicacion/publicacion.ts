import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { Publicacion } from '../../models/publicacion';
import { PerfilUsuario } from '../../models/usuario';
import { InicialesPipe } from '../../pipes/iniciales-pipe';
import { TiempoRelativoPipe } from '../../pipes/tiempo-relativo-pipe';
import { Comentarios } from '../comentarios/comentarios';

// Cuántos comentarios se ven al desplegarlos en la tarjeta del listado.
const COMENTARIOS_EN_TARJETA = 3;

@Component({
  selector: 'app-publicacion',
  imports: [DatePipe, RouterLink, InicialesPipe, TiempoRelativoPipe, Comentarios],
  templateUrl: './publicacion.html',
  styleUrl: './publicacion.css',
})
export class PublicacionCard {
  private readonly authService = inject(AuthService);

  readonly publicacion = input.required<Publicacion>();
  // En Mi perfil se muestra solo para leer.
  readonly interactiva = input(true);
  // En la página de detalle se muestra en grande y el título ya no enlaza a sí misma.
  readonly grande = input(false);

  readonly alternarLike = output<Publicacion>();
  readonly eliminar = output<Publicacion>();

  protected readonly comentariosEnTarjeta = COMENTARIOS_EN_TARJETA;
  // Los comentarios se piden recién al desplegarlos: el listado no hace un pedido por tarjeta.
  protected readonly comentariosAbiertos = signal(false);

  protected readonly usuarioId = computed(() => this.authService.usuarioActual()?.id ?? null);
  protected readonly leDiMeGusta = computed(() => {
    const id = this.usuarioId();
    return id !== null && this.publicacion().likes.includes(id);
  });
  protected readonly esMia = computed(() => this.publicacion().autor.id === this.usuarioId());
  protected readonly esAdministrador = computed(
    () => this.authService.usuarioActual()?.perfil === PerfilUsuario.ADMINISTRADOR,
  );
  // Un admin puede dar de baja cualquier publicación, no solo la propia.
  protected readonly puedeEliminar = computed(() => this.esMia() || this.esAdministrador());
}
