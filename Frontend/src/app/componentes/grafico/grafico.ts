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

// Colores del sistema de diseño (styles.css): Chart.js dibuja en canvas y no lee variables CSS.
const PALETA = ['#c6f432', '#ff5c39', '#8fa0ff', '#5ad1e6', '#c77dff', '#ffd54a', '#3ecf7a', '#f2a900'];
const COLOR_TEXTO = '#ececec';
const COLOR_LINEA = '#383838';

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

    return {
      type: tipo,
      data: {
        labels: etiquetas,
        datasets: [
          {
            label: this.serie(),
            data: valores,
            backgroundColor: esTorta
              ? etiquetas.map((_, i) => PALETA[i % PALETA.length])
              : tipo === 'line'
                ? 'rgba(198, 244, 50, 0.15)'
                : PALETA[0],
            borderColor: esTorta ? '#000000' : PALETA[0],
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
          legend: { display: esTorta, position: 'bottom', labels: { color: COLOR_TEXTO } },
        },
        scales: esTorta
          ? {}
          : {
              x: { ticks: { color: COLOR_TEXTO }, grid: { color: COLOR_LINEA } },
              y: {
                beginAtZero: true,
                ticks: { color: COLOR_TEXTO, precision: 0 },
                grid: { color: COLOR_LINEA },
              },
            },
      },
    };
  }
}
