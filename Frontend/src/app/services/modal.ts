import { Service, signal } from '@angular/core';

export type TipoModal = 'exito' | 'error' | 'confirmacion';

export interface EstadoModal {
  tipo: TipoModal;
  titulo: string;
  mensaje: string;
  onConfirmar?: () => void;
  // Si es true, un clic en el fondo no lo cierra: hay que elegir un botón.
  persistente?: boolean;
}

@Service()
export class ModalService {
  readonly estado = signal<EstadoModal | null>(null);

  exito(mensaje: string, titulo = 'Listo'): void {
    this.estado.set({ tipo: 'exito', titulo, mensaje });
  }

  error(mensaje: string, titulo = 'Ocurrió un error'): void {
    this.estado.set({ tipo: 'error', titulo, mensaje });
  }

  confirmar(
    mensaje: string,
    onConfirmar: () => void,
    titulo = 'Confirmar',
    persistente = false,
  ): void {
    this.estado.set({ tipo: 'confirmacion', titulo, mensaje, onConfirmar, persistente });
  }

  cerrar(): void {
    this.estado.set(null);
  }
}
