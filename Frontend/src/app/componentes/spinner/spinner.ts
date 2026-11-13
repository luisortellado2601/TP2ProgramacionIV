import { ChangeDetectionStrategy, Component, input } from '@angular/core';

// Indicador de carga único de la app: se usa mientras una pantalla espera datos del back.
// `pequeno` es la versión para listas dentro de una tarjeta (p. ej. los comentarios).
@Component({
  selector: 'app-spinner',
  templateUrl: './spinner.html',
  styleUrl: './spinner.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Spinner {
  readonly mensaje = input('');
  readonly pequeno = input(false);
}
