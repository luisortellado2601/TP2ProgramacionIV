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

const VELOCIDAD_PX_POR_SEGUNDO = 28;
const VELOCIDAD_VUELTA_PX_POR_SEGUNDO = 900;
const ESPERA_TRAS_INTERACCION_MS = 4000;
const ESPERA_EN_EXTREMO_MS = 1800;

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
  protected readonly pausadoPorUsuario = signal(false);
  protected readonly avanzando = signal(false);

  private posicion = 0;
  private ultimoValor = 0;
  private ultimaMarca = 0;
  private pausaHasta = 0;
  private encima = false;
  private volviendo = false;
  private marco = 0;

  constructor() {
    afterNextRender(() => {
      this.actualizarExtremos();
      if (this.prefiereMovimientoReducido()) {
        this.pausadoPorUsuario.set(true);
      }
      this.marco = requestAnimationFrame(this.paso);
    });
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.marco));
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
    pista.scrollBy({
      left: sentido * pista.clientWidth * 0.85,
      behavior: this.prefiereMovimientoReducido() ? 'auto' : 'smooth',
    });
  }

  protected alternarPausa(): void {
    this.pausadoPorUsuario.update((pausado) => !pausado);
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

  private readonly paso = (marca: number): void => {
    const pista = this.pista().nativeElement;
    const transcurrido = this.ultimaMarca ? Math.min(marca - this.ultimaMarca, 100) : 0;
    this.ultimaMarca = marca;

    if (Math.abs(pista.scrollLeft - this.ultimoValor) > 2) {
      this.posicion = pista.scrollLeft;
      this.ultimoValor = pista.scrollLeft;
      this.pausaHasta = marca + ESPERA_TRAS_INTERACCION_MS;
    }

    const activo = !this.pausadoPorUsuario() && !this.encima && marca >= this.pausaHasta;
    this.avanzando.set(activo);

    if (activo) {
      const maximo = pista.scrollWidth - pista.clientWidth;
      if (this.volviendo) {
        this.posicion = Math.max(
          0,
          this.posicion - (VELOCIDAD_VUELTA_PX_POR_SEGUNDO * transcurrido) / 1000,
        );
        if (this.posicion <= 0) {
          this.volviendo = false;
          this.pausaHasta = marca + ESPERA_EN_EXTREMO_MS;
        }
      } else if (this.posicion >= maximo - 1) {
        this.volviendo = true;
        this.pausaHasta = marca + ESPERA_EN_EXTREMO_MS;
      } else {
        this.posicion = Math.min(
          maximo,
          this.posicion + (VELOCIDAD_PX_POR_SEGUNDO * transcurrido) / 1000,
        );
      }
      pista.scrollLeft = this.posicion;
      this.ultimoValor = pista.scrollLeft;
    }

    this.marco = requestAnimationFrame(this.paso);
  };

  private prefiereMovimientoReducido(): boolean {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }
}
