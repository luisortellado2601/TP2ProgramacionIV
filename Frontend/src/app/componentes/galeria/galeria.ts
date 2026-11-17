import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

const INTERVALO_MS = 4500;
const ESPERA_TRAS_INTERACCION_MS = 9000;

@Component({
  selector: 'app-galeria',
  templateUrl: './galeria.html',
  styleUrl: './galeria.css',
})
export class Galeria {
  readonly imagenes = input.required<string[]>();
  readonly titulo = input.required<string>();

  private readonly pista = viewChild.required<ElementRef<HTMLElement>>('pista');
  protected readonly actual = signal(0);

  private encima = false;
  private pausaHasta = 0;
  private intervalo: ReturnType<typeof setInterval> | null = null;

  constructor() {
    afterNextRender(() => {
      if (!this.prefiereMovimientoReducido()) {
        this.intervalo = setInterval(() => this.avanzarSola(), INTERVALO_MS);
      }
    });
    inject(DestroyRef).onDestroy(() => {
      if (this.intervalo) {
        clearInterval(this.intervalo);
      }
    });
  }

  protected mover(sentido: 1 | -1): void {
    this.pausarTemporalmente();
    const total = this.imagenes().length;
    this.ir((this.actual() + sentido + total) % total);
  }

  protected ir(indice: number): void {
    const pista = this.pista().nativeElement;
    this.actual.set(indice);
    pista.scrollTo({
      left: indice * pista.clientWidth,
      behavior: this.prefiereMovimientoReducido() ? 'auto' : 'smooth',
    });
  }

  protected alDesplazar(): void {
    const pista = this.pista().nativeElement;
    if (pista.clientWidth > 0) {
      this.actual.set(Math.round(pista.scrollLeft / pista.clientWidth));
    }
  }

  protected entrar(): void {
    this.encima = true;
  }

  protected salir(): void {
    this.encima = false;
  }

  protected pausarTemporalmente(): void {
    this.pausaHasta = performance.now() + ESPERA_TRAS_INTERACCION_MS;
  }

  protected ocultarImagen(evento: Event): void {
    (evento.target as HTMLElement).hidden = true;
  }

  private avanzarSola(): void {
    const total = this.imagenes().length;
    if (total < 2 || this.encima || performance.now() < this.pausaHasta) {
      return;
    }
    this.ir((this.actual() + 1) % total);
  }

  private prefiereMovimientoReducido(): boolean {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }
}
