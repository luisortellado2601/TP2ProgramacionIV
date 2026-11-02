import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { AuthService } from '../../services/auth';
import { Publicacion } from '../../models/publicacion';

@Component({
  selector: 'app-publicacion',
  imports: [DatePipe],
  templateUrl: './publicacion.html',
  styleUrl: './publicacion.css',
})
export class PublicacionCard {
  private readonly authService = inject(AuthService);

  readonly publicacion = input.required<Publicacion>();
  // En Mi perfil se muestra solo para leer.
  readonly interactiva = input(true);

  readonly alternarLike = output<Publicacion>();
  readonly eliminar = output<Publicacion>();

  protected readonly usuarioId = computed(() => this.authService.usuarioActual()?.id ?? null);
  protected readonly leDiMeGusta = computed(() => {
    const id = this.usuarioId();
    return id !== null && this.publicacion().likes.includes(id);
  });
  protected readonly esMia = computed(() => this.publicacion().autor.id === this.usuarioId());
}
