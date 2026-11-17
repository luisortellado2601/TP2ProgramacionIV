import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartConfiguration,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PieController,
  PointElement,
  Tooltip,
} from 'chart.js';
import { TemaService } from '../../services/tema';

// Se registra solo lo que se usa (barras, líneas y torta), para no cargar todo Chart.js.
Chart.register(
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PieController,
  PointElement,
  Tooltip,
);

export type TipoGrafico = 'bar' | 'line' | 'pie';

const VARIABLES_PALETA = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `--grafico-${n}`);

function leerColor(variable: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
}

function conTransparencia(hex: string, alfa: number): string {
  const valor = parseInt(hex.slice(1), 16);
  return `rgba(${(valor >> 16) & 255}, ${(valor >> 8) & 255}, ${valor & 255}, ${alfa})`;
}

// Gráfico de un solo conjunto de datos: dibuja un <canvas> con Chart.js y lo actualiza
// cuando cambian las etiquetas o los valores.
@Component({
  selector: 'app-grafico',
  templateUrl: './grafico.html',
  styleUrl: './grafico.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Grafico {
  readonly tipo = input.required<TipoGrafico>();
  readonly etiquetas = input.required<string[]>();
  readonly valores = input.required<number[]>();
  // Nombre de lo que se cuenta (aparece en el tooltip y en la leyenda).
  readonly serie = input.required<string>();
  readonly descripcion = input('');

  private readonly temaService = inject(TemaService);
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private grafico?: Chart;

  constructor() {
    effect(() => {
      const configuracion = this.configuracion();
      this.grafico?.destroy();
      this.grafico = new Chart(this.canvas().nativeElement, configuracion);
    });
    inject(DestroyRef).onDestroy(() => this.grafico?.destroy());
  }

  private configuracion(): ChartConfiguration {
    const tipo = this.tipo();
    const etiquetas = this.etiquetas();
    const valores = this.valores();
    const esTorta = tipo === 'pie';
    this.temaService.tema();
    const paleta = VARIABLES_PALETA.map(leerColor);
    const colorTexto = leerColor('--color-text');
    const colorLinea = leerColor('--color-line');

    return {
      type: tipo,
      data: {
        labels: etiquetas,
        datasets: [
          {
            label: this.serie(),
            data: valores,
            backgroundColor: esTorta
              ? etiquetas.map((_, i) => paleta[i % paleta.length])
              : tipo === 'line'
                ? conTransparencia(paleta[0], 0.15)
                : paleta[0],
            borderColor: esTorta ? leerColor('--color-surface') : paleta[0],
            borderWidth: esTorta ? 2 : tipo === 'line' ? 3 : 0,
            fill: tipo === 'line',
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: esTorta, position: 'bottom', labels: { color: colorTexto } },
        },
        scales: esTorta
          ? {}
          : {
              x: { ticks: { color: colorTexto }, grid: { color: colorLinea } },
              y: {
                beginAtZero: true,
                ticks: { color: colorTexto, precision: 0 },
                grid: { color: colorLinea },
              },
            },
      },
    };
  }
}
