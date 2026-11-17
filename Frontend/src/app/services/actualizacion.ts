import { Service, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';
import { ModalService } from './modal';

const REVISION_CADA_MS = 60 * 60 * 1000;
const REINTENTO_SI_HAY_MODAL_MS = 15 * 1000;
const MENSAJE =
  'Hay una versión nueva de NextPlay. ¿Querés actualizar ahora? La página se recarga.';

@Service()
export class ActualizacionService {
  private readonly swUpdate = inject(SwUpdate, { optional: true });
  private readonly modalService = inject(ModalService);
  private iniciado = false;
  private avisoPendiente = false;

  iniciar(): void {
    if (this.iniciado || !this.swUpdate?.isEnabled) {
      return;
    }
    this.iniciado = true;

    this.swUpdate.versionUpdates
      .pipe(filter((evento): evento is VersionReadyEvent => evento.type === 'VERSION_READY'))
      .subscribe(() => this.avisar());
    this.swUpdate.unrecoverable.subscribe(() => this.avisar());

    setInterval(() => this.buscar(), REVISION_CADA_MS);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.buscar();
      }
    });
  }

  protected recargar(): void {
    document.location.reload();
  }

  private buscar(): void {
    this.swUpdate?.checkForUpdate().catch(() => false);
  }

  private avisar(): void {
    if (this.avisoPendiente) {
      return;
    }
    this.avisoPendiente = true;
    this.mostrar();
  }

  private mostrar(): void {
    if (this.modalService.estado()) {
      setTimeout(() => this.mostrar(), REINTENTO_SI_HAY_MODAL_MS);
      return;
    }
    this.modalService.confirmar(MENSAJE, () => this.recargar(), 'Versión nueva', false, {
      textoConfirmar: 'Actualizar',
      textoCancelar: 'Más tarde',
      onCancelar: () => (this.avisoPendiente = false),
    });
  }
}
