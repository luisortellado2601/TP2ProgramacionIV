import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Juego } from '../../models/juego';
import { JuegosService } from '../../services/juegos';

const INTERVALO_MS = 3500;
const ESPERA_TRAS_INTERACCION_MS = 8000;

@Component({
  selector: 'app-juegos-destacados',
  imports: [RouterLink],
  templateUrl: './juegos-destacados.html',
  styleUrl: './juegos-destacados.css',
})
export class JuegosDestacados {
  private readonly juegosService = inject(JuegosService);
  private readonly pista = viewChild.required<ElementRef<HTMLElement>>('pista');

  protected readonly juegos = this.juegosService.listar();
  protected readonly alInicio = signal(true);
  protected readonly alFinal = signal(false);

  private encima = false;
  private pausaHasta = 0;
  private intervalo: ReturnType<typeof setInterval> | null = null;

  constructor() {
    afterNextRender(() => {
      this.actualizarExtremos();
      if (!this.prefiereMovimientoReducido()) {
        this.intervalo = setInterval(() => this.avanzarSolo(), INTERVALO_MS);
      }
    });
    inject(DestroyRef).onDestroy(() => {
      if (this.intervalo) {
        clearInterval(this.intervalo);
      }
    });
  }

  protected portada(juego: Juego): string {
    return this.juegosService.portada(juego);
  }

  protected ocultarImagen(evento: Event): void {
    (evento.target as HTMLElement).hidden = true;
  }

  protected mover(sentido: 1 | -1): void {
    const pista = this.pista().nativeElement;
    this.pausarTemporalmente();
    pista.scrollBy({ left: sentido * pista.clientWidth * 0.85, behavior: this.comportamiento() });
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

  protected actualizarExtremos(): void {
    const pista = this.pista().nativeElement;
    this.alInicio.set(pista.scrollLeft <= 1);
    this.alFinal.set(pista.scrollLeft + pista.clientWidth >= pista.scrollWidth - 1);
  }

  private avanzarSolo(): void {
    if (this.encima || performance.now() < this.pausaHasta) {
      return;
    }
    const pista = this.pista().nativeElement;
    const alFinal = pista.scrollLeft + pista.clientWidth >= pista.scrollWidth - 1;
    if (alFinal) {
      pista.scrollTo({ left: 0, behavior: this.comportamiento() });
      return;
    }
    pista.scrollBy({ left: this.anchoDeUnaTarjeta(pista), behavior: this.comportamiento() });
  }

  private anchoDeUnaTarjeta(pista: HTMLElement): number {
    const tarjeta = pista.querySelector('li');
    const ancho = tarjeta?.getBoundingClientRect().width ?? 0;
    const separacion = parseFloat(getComputedStyle(pista).columnGap) || 0;
    return ancho > 0 ? ancho + separacion : pista.clientWidth * 0.4;
  }

  private comportamiento(): ScrollBehavior {
    return this.prefiereMovimientoReducido() ? 'auto' : 'smooth';
  }

  private prefiereMovimientoReducido(): boolean {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }
}
