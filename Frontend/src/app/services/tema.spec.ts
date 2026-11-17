import { TestBed } from '@angular/core/testing';
import { TemaService } from './tema';

const CLAVE_TEMA = 'nextplay_tema';

describe('TemaService', () => {
  let meta: HTMLMetaElement;

  beforeEach(() => {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = '#0e1019';
    document.head.appendChild(meta);
  });

  afterEach(() => {
    meta.remove();
    localStorage.clear();
    document.documentElement.removeAttribute('data-tema');
    vi.unstubAllGlobals();
  });

  it('arranca en oscuro si no hay preferencia guardada ni del sistema', () => {
    const servicio = TestBed.inject(TemaService);

    expect(servicio.tema()).toBe('oscuro');
    expect(document.documentElement.getAttribute('data-tema')).toBe('oscuro');
  });

  it('usa el modo claro si el sistema lo prefiere y la persona no eligió nada', () => {
    vi.stubGlobal('matchMedia', (consulta: string) => ({
      matches: consulta.includes('light'),
    }));

    const servicio = TestBed.inject(TemaService);

    expect(servicio.tema()).toBe('claro');
    expect(document.documentElement.getAttribute('data-tema')).toBe('claro');
  });

  it('la elección guardada gana sobre la preferencia del sistema', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    localStorage.setItem(CLAVE_TEMA, 'oscuro');

    expect(TestBed.inject(TemaService).tema()).toBe('oscuro');
  });

  it('ignora un valor guardado inválido', () => {
    localStorage.setItem(CLAVE_TEMA, 'rojo');

    expect(TestBed.inject(TemaService).tema()).toBe('oscuro');
  });

  it('alternar cambia el tema, lo aplica al documento y lo recuerda', () => {
    const servicio = TestBed.inject(TemaService);

    servicio.alternar();

    expect(servicio.tema()).toBe('claro');
    expect(document.documentElement.getAttribute('data-tema')).toBe('claro');
    expect(localStorage.getItem(CLAVE_TEMA)).toBe('claro');

    servicio.alternar();

    expect(servicio.tema()).toBe('oscuro');
    expect(localStorage.getItem(CLAVE_TEMA)).toBe('oscuro');
  });

  it('actualiza el color de la barra del navegador según el tema', () => {
    const servicio = TestBed.inject(TemaService);
    expect(meta.content).toBe('#0e1019');

    servicio.elegir('claro');

    expect(meta.content).toBe('#ffffff');
  });
});
