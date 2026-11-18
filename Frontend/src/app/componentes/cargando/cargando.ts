import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ModalService } from '../../services/modal';
import { arranqueYaVisto, marcarArranqueVisto } from '../../utils/arranque';
import { mensajeDeError } from '../../utils/mensaje-error';
import { Spinner } from '../spinner/spinner';

const DURACION_ARRANQUE_MS = 2600;
const DURACION_REDUCIDA_MS = 400;

@Component({
  selector: 'app-cargando',
  imports: [Spinner],
  templateUrl: './cargando.html',
  styleUrl: './cargando.css',
})
export class Cargando implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly modalService = inject(ModalService);
  private readonly router = inject(Router);

  protected readonly letras = [...'NEXTPLAY'];
  protected readonly conArranque = !arranqueYaVisto();
  protected readonly conSesion = this.authService.estaAutenticado();
  protected readonly lema = this.armarLema();

  protected readonly animacionTerminada = signal(false);
  private readonly destino = signal<string | null>(null);
  protected readonly listo = computed(() => this.animacionTerminada() && this.destino() !== null);

  private readonly botonEmpezar = viewChild<ElementRef<HTMLButtonElement>>('empezar');
  private navegando = false;

  constructor() {
    const temporizador = setTimeout(
      () => this.animacionTerminada.set(true),
      this.conArranque ? this.duracion() : 0,
    );
    inject(DestroyRef).onDestroy(() => clearTimeout(temporizador));

    effect(() => {
      if (this.listo() && (this.conSesion || !this.conArranque)) {
        this.entrar();
      }
    });

    effect(() => this.botonEmpezar()?.nativeElement.focus());
  }

  ngOnInit(): void {
    if (!this.conSesion) {
      this.destino.set('/login');
      return;
    }

    this.authService.autorizar().subscribe({
      next: () => this.destino.set('/publicaciones'),
      error: (error: unknown) => {
        this.modalService.error(
          mensajeDeError(error, 'No pudimos validar tu sesión. Iniciá sesión nuevamente.'),
        );
        this.destino.set('/login');
        this.entrar();
      },
    });
  }

  saltar(): void {
    if (this.destino() !== null) {
      this.entrar();
    }
  }

  private entrar(): void {
    const destino = this.destino();
    if (this.navegando || destino === null) {
      return;
    }
    this.navegando = true;
    marcarArranqueVisto();
    this.router.navigateByUrl(destino);
  }

  private armarLema(): string {
    const nombreUsuario = this.authService.usuarioActual()?.nombre;
    return nombreUsuario
      ? `Qué bueno verte, ${nombreUsuario}`
      : 'Compartí reseñas y encontrá con quién jugar.';
  }

  private duracion(): number {
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    return reducido ? DURACION_REDUCIDA_MS : DURACION_ARRANQUE_MS;
  }
}
