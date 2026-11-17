import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { JuegosService } from '../../services/juegos';
import { Galeria } from '../galeria/galeria';

@Component({
  selector: 'app-juego-detalle',
  imports: [RouterLink, Galeria],
  templateUrl: './juego-detalle.html',
  styleUrl: './juego-detalle.css',
})
export class JuegoDetalle {
  private readonly juegosService = inject(JuegosService);

  protected readonly juego = this.juegosService.obtener(
    inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '',
  );
  protected readonly portada = this.juego ? this.juegosService.portada(this.juego) : '';

  protected ocultarImagen(evento: Event): void {
    (evento.target as HTMLElement).hidden = true;
  }
}
