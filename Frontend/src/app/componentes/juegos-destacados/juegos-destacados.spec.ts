import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { JuegosService } from '../../services/juegos';
import { JuegosDestacados } from './juegos-destacados';

const ANCHO_VISIBLE = 400;
const ANCHO_TOTAL = 2000;

describe('JuegosDestacados', () => {
  function crear(opciones: { movimientoReducido?: boolean } = {}) {
    vi.useFakeTimers({
      toFake: [
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'performance',
        'setTimeout',
        'clearTimeout',
        'Date',
      ],
    });
    if (opciones.movimientoReducido) {
      vi.stubGlobal('matchMedia', () => ({ matches: true }));
    }
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(JuegosDestacados);
    const html = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    const pista = html.querySelector('.juegos__pista') as HTMLElement;
    let scrollLeft = 0;
    Object.defineProperty(pista, 'scrollLeft', {
      configurable: true,
      get: () => scrollLeft,
      set: (valor: number) => (scrollLeft = valor),
    });
    Object.defineProperty(pista, 'clientWidth', { configurable: true, value: ANCHO_VISIBLE });
    Object.defineProperty(pista, 'scrollWidth', { configurable: true, value: ANCHO_TOTAL });
    return {
      fixture,
      html,
      pista,
      posicion: () => scrollLeft,
      mover: (valor: number) => (scrollLeft = valor),
    };
  }

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('muestra una tarjeta por juego, con su título', () => {
    const { html } = crear();
    const juegos = TestBed.inject(JuegosService).listar();

    expect(html.querySelectorAll('.juego-tarjeta').length).toBe(juegos.length);
    expect(html.textContent).toContain('Fortnite');
    expect(html.textContent).toContain('Counter-Strike 2');
  });

  it('cada tarjeta lleva a la ficha del juego', () => {
    const { html } = crear();

    const enlace = Array.from(html.querySelectorAll('a.juego-tarjeta')).find((a) =>
      a.textContent?.includes('Elden Ring'),
    );
    expect(enlace?.getAttribute('href')).toBe('/juegos/elden-ring');
  });

  it('la carátula es decorativa (el título ya nombra el enlace) y se carga de a una', () => {
    const { html } = crear();

    const imagen = html.querySelector('.juego-tarjeta img') as HTMLImageElement;
    expect(imagen.getAttribute('alt')).toBe('');
    expect(imagen.getAttribute('loading')).toBe('lazy');
  });

  it('si una imagen no carga, se oculta pero la tarjeta sigue mostrando el título', () => {
    const { html } = crear();
    const imagen = html.querySelector('.juego-tarjeta img') as HTMLImageElement;

    imagen.dispatchEvent(new Event('error'));

    expect(imagen.hidden).toBe(true);
    expect(html.querySelector('.juego-tarjeta__titulo')?.textContent).toContain('Fortnite');
  });

  it('tiene flechas para deslizar y un botón de pausa, accesibles por su nombre', () => {
    const { html } = crear();

    expect(html.querySelector('button[aria-label="Ver juegos anteriores"]')).not.toBeNull();
    expect(html.querySelector('button[aria-label="Ver más juegos"]')).not.toBeNull();
    expect(
      html.querySelector('button[aria-label="Pausar el desplazamiento automático"]'),
    ).not.toBeNull();
  });

  it('se desliza solo, lentamente, sin que nadie lo toque', async () => {
    const { posicion } = crear();

    await vi.advanceTimersByTimeAsync(2000);

    expect(posicion()).toBeGreaterThan(30);
    expect(posicion()).toBeLessThan(100);
  });

  it('se detiene mientras el mouse está encima y sigue al sacarlo', async () => {
    const { html, posicion } = crear();
    const seccion = html.querySelector('.juegos') as HTMLElement;

    seccion.dispatchEvent(new Event('mouseenter'));
    await vi.advanceTimersByTimeAsync(2000);
    expect(posicion()).toBe(0);

    seccion.dispatchEvent(new Event('mouseleave'));
    await vi.advanceTimersByTimeAsync(2000);
    expect(posicion()).toBeGreaterThan(30);
  });

  it('se detiene mientras un elemento tiene el foco del teclado', async () => {
    const { html, posicion } = crear();
    const seccion = html.querySelector('.juegos') as HTMLElement;

    seccion.dispatchEvent(new Event('focusin'));
    await vi.advanceTimersByTimeAsync(2000);

    expect(posicion()).toBe(0);
  });

  it('el botón de pausa lo detiene y lo reanuda', async () => {
    const { fixture, html, posicion } = crear();
    const boton = () => html.querySelector('.juegos__controles > button') as HTMLButtonElement;

    boton().click();
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(2000);
    expect(posicion()).toBe(0);
    expect(boton().getAttribute('aria-label')).toBe('Reanudar el desplazamiento automático');
    expect(boton().getAttribute('aria-pressed')).toBe('true');

    boton().click();
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(2000);
    expect(posicion()).toBeGreaterThan(30);
    expect(boton().getAttribute('aria-pressed')).toBe('false');
  });

  it('si la persona lo desliza, espera unos segundos antes de seguir solo', async () => {
    const { posicion, mover } = crear();
    await vi.advanceTimersByTimeAsync(100);

    mover(700);
    await vi.advanceTimersByTimeAsync(2000);
    expect(posicion()).toBe(700);

    await vi.advanceTimersByTimeAsync(5000);
    expect(posicion()).toBeGreaterThan(700);
  });

  it('al llegar al final espera un momento y vuelve al principio', async () => {
    const { posicion, mover } = crear();
    await vi.advanceTimersByTimeAsync(100);

    mover(ANCHO_TOTAL - ANCHO_VISIBLE);
    await vi.advanceTimersByTimeAsync(4100);
    await vi.advanceTimersByTimeAsync(3000);

    expect(posicion()).toBeLessThan(ANCHO_TOTAL - ANCHO_VISIBLE);
  });

  it('con movimiento reducido no se desliza solo y arranca en pausa', async () => {
    const { fixture, html, posicion } = crear({ movimientoReducido: true });
    fixture.detectChanges();

    await vi.advanceTimersByTimeAsync(3000);

    expect(posicion()).toBe(0);
    expect(
      html.querySelector('button[aria-label="Reanudar el desplazamiento automático"]'),
    ).not.toBeNull();
  });
});
