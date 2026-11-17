import { TestBed } from '@angular/core/testing';
import { SwUpdate } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { ActualizacionService } from './actualizacion';
import { ModalService } from './modal';

describe('ActualizacionService', () => {
  let versiones: Subject<{ type: string }>;
  let irrecuperable: Subject<unknown>;
  let swUpdate: {
    isEnabled: boolean;
    versionUpdates: Subject<{ type: string }>;
    unrecoverable: Subject<unknown>;
    checkForUpdate: ReturnType<typeof vi.fn>;
  };
  let modal: ModalService;

  function crear(opciones: { habilitado?: boolean; sinServiceWorker?: boolean } = {}) {
    versiones = new Subject();
    irrecuperable = new Subject();
    swUpdate = {
      isEnabled: opciones.habilitado ?? true,
      versionUpdates: versiones,
      unrecoverable: irrecuperable,
      checkForUpdate: vi.fn().mockResolvedValue(false),
    };
    TestBed.configureTestingModule({
      providers: opciones.sinServiceWorker ? [] : [{ provide: SwUpdate, useValue: swUpdate }],
    });
    modal = TestBed.inject(ModalService);
    const servicio = TestBed.inject(ActualizacionService);
    servicio.iniciar();
    return servicio;
  }

  beforeEach(() => vi.useFakeTimers());

  afterEach(() => vi.useRealTimers());

  it('cuando hay una versión nueva lista, ofrece actualizar o dejarlo para más tarde', () => {
    crear();

    versiones.next({ type: 'VERSION_READY' });

    const estado = modal.estado();
    expect(estado?.tipo).toBe('confirmacion');
    expect(estado?.titulo).toBe('Versión nueva');
    expect(estado?.mensaje).toContain('versión nueva de NextPlay');
    expect(estado?.textoConfirmar).toBe('Actualizar');
    expect(estado?.textoCancelar).toBe('Más tarde');
  });

  it('ignora los eventos que no son de versión lista', () => {
    crear();

    versiones.next({ type: 'VERSION_DETECTED' });
    versiones.next({ type: 'NO_NEW_VERSION_DETECTED' });

    expect(modal.estado()).toBeNull();
  });

  it('al aceptar, recarga la página', () => {
    const servicio = crear();
    const recargar = vi
      .spyOn(servicio as unknown as { recargar: () => void }, 'recargar')
      .mockImplementation(() => undefined);

    versiones.next({ type: 'VERSION_READY' });
    modal.estado()?.onConfirmar?.();

    expect(recargar).toHaveBeenCalledOnce();
  });

  it('no avisa dos veces mientras el aviso sigue abierto', () => {
    crear();

    versiones.next({ type: 'VERSION_READY' });
    modal.cerrar();
    versiones.next({ type: 'VERSION_READY' });

    expect(modal.estado()).toBeNull();
  });

  it('si la persona elige "Más tarde", puede volver a avisar en la próxima detección', () => {
    crear();
    versiones.next({ type: 'VERSION_READY' });

    modal.estado()?.onCancelar?.();
    modal.cerrar();
    versiones.next({ type: 'VERSION_READY' });

    expect(modal.estado()?.titulo).toBe('Versión nueva');
  });

  it('si hay otro aviso abierto (p. ej. el de sesión por vencer), espera y no lo pisa', async () => {
    crear();
    modal.confirmar('Tu sesión vence en 1 minuto.', () => undefined, 'Sesión', true);

    versiones.next({ type: 'VERSION_READY' });
    expect(modal.estado()?.titulo).toBe('Sesión');

    modal.cerrar();
    await vi.advanceTimersByTimeAsync(16000);

    expect(modal.estado()?.titulo).toBe('Versión nueva');
  });

  it('también avisa si el service worker queda en un estado irrecuperable', () => {
    crear();

    irrecuperable.next({ reason: 'cache corrupta' });

    expect(modal.estado()?.titulo).toBe('Versión nueva');
  });

  it('busca versiones nuevas cada una hora', async () => {
    crear();
    expect(swUpdate.checkForUpdate).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);

    expect(swUpdate.checkForUpdate).toHaveBeenCalledOnce();
  });

  it('busca versiones nuevas al volver a la pestaña', () => {
    crear();

    document.dispatchEvent(new Event('visibilitychange'));

    expect(swUpdate.checkForUpdate).toHaveBeenCalledOnce();
  });

  it('con el service worker deshabilitado (desarrollo) no hace nada', async () => {
    crear({ habilitado: false });

    versiones.next({ type: 'VERSION_READY' });
    await vi.advanceTimersByTimeAsync(2 * 60 * 60 * 1000);

    expect(modal.estado()).toBeNull();
    expect(swUpdate.checkForUpdate).not.toHaveBeenCalled();
  });

  it('sin service worker disponible no falla', () => {
    expect(() => crear({ sinServiceWorker: true })).not.toThrow();
  });
});
