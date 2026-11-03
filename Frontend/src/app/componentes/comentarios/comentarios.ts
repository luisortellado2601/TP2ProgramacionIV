import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { ComentariosService } from '../../services/comentarios';
import { Comentario } from '../../models/comentario';

@Component({
  selector: 'app-comentarios',
  imports: [DatePipe],
  templateUrl: './comentarios.html',
  styleUrl: './comentarios.css',
})
export class Comentarios implements OnInit {
  private readonly comentariosService = inject(ComentariosService);

  readonly publicacionId = input.required<string>();
  // Cuántos comentarios (los más recientes) se traen en la primera carga.
  readonly limite = input(5);

  protected readonly comentarios = signal<Comentario[]>([]);
  protected readonly total = signal(0);
  protected readonly cargando = signal(true);
  protected readonly falloCarga = signal(false);

  protected readonly ocultos = computed(() => Math.max(0, this.total() - this.comentarios().length));

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.comentariosService.listar(this.publicacionId(), 0, this.limite()).subscribe({
      next: ({ total, comentarios }) => {
        this.comentarios.set(comentarios);
        this.total.set(total);
        this.cargando.set(false);
      },
      error: () => {
        this.falloCarga.set(true);
        this.cargando.set(false);
      },
    });
  }
}
