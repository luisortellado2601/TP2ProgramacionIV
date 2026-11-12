import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { Publicacion } from '../../models/publicacion';
import { PerfilUsuario } from '../../models/usuario';
import { InicialesPipe } from '../../pipes/iniciales-pipe';

@Component({
  selector: 'app-publicacion',
  imports: [DatePipe, RouterLink, InicialesPipe],
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
