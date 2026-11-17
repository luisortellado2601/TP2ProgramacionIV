import { Component, inject } from '@angular/core';
import { ModalService } from '../../services/modal';

@Component({
  selector: 'app-modal',
  imports: [],
  templateUrl: './modal.html',
  styleUrl: './modal.css',
})
export class Modal {
  protected readonly modalService = inject(ModalService);

  confirmar(): void {
    this.modalService.estado()?.onConfirmar?.();
    this.modalService.cerrar();
  }

  cerrar(): void {
    this.modalService.estado()?.onCancelar?.();
    this.modalService.cerrar();
  }

  cerrarPorFondo(): void {
    if (!this.modalService.estado()?.persistente) {
      this.cerrar();
    }
  }
}
