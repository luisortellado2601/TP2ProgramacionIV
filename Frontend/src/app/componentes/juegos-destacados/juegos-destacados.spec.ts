import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { JuegosService } from '../../services/juegos';
import { JuegosDestacados } from './juegos-destacados';

const ANCHO_VISIBLE = 400;
const ANCHO_TOTAL = 2000;

describe('JuegosDestacados', () => {
  function crear(opciones: { movimientoReducido?: boolean } = {}) {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance', 'Date'] });
    if (opciones.movimientoReducido) {
      vi.stubGlobal('matchMedia', () => ({ matches: true }));
    }
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(JuegosDestacados);
    const html = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    const pista = html.querySelector('.juegos__pista') as HTMLElement;
    const scrollBy = vi.fn();
    const scrollTo = vi.fn();
    let scrollLeft = 0;
    Object.defineProperty(pista, 'scrollLeft', {
      configurable: true,
      get: () => scrollLeft,
      set: (valor: number) => (scrollLeft = valor),
    });
    Object.defineProperty(pista, 'clientWidth', { configurable: true, value: ANCHO_VISIBLE });
    Object.defineProperty(pista, 'scrollWidth', { configurable: true, value: ANCHO_TOTAL });
    pista.scrollBy = scrollBy as unknown as typeof pista.scrollBy;
    pista.scrollTo = scrollTo as unknown as typeof pista.scrollTo;
    return { fixture, html, scrollBy, scrollTo, mover: (valor: number) => (scrollLeft = valor) };
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

  it('tiene flechas para deslizar y no tiene botón de pausa', () => {
    const { html } = crear();

    expect(html.querySelector('button[aria-label="Ver juegos anteriores"]')).not.toBeNull();
    expect(html.querySelector('button[aria-label="Ver más juegos"]')).not.toBeNull();
    expect(html.querySelectorAll('.juegos button').length).toBe(2);
  });

  it('avanza solo, de a una tarjeta, en intervalos', async () => {
    const { scrollBy } = crear();

    await vi.advanceTimersByTimeAsync(3400);
    expect(scrollBy).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(200);
    expect(scrollBy).toHaveBeenCalledOnce();
    expect(scrollBy.mock.calls[0][0].left).toBeGreaterThan(0);

    await vi.advanceTimersByTimeAsync(3500);
    expect(scrollBy).toHaveBeenCalledTimes(2);
  });

  it('se detiene mientras el mouse está encima y sigue al sacarlo', async () => {
    const { html, scrollBy } = crear();
    const seccion = html.querySelector('.juegos') as HTMLElement;

    seccion.dispatchEvent(new Event('mouseenter'));
    await vi.advanceTimersByTimeAsync(8000);
    expect(scrollBy).not.toHaveBeenCalled();

    seccion.dispatchEvent(new Event('mouseleave'));
    await vi.advanceTimersByTimeAsync(3600);
    expect(scrollBy).toHaveBeenCalled();
  });

  it('se detiene mientras un elemento tiene el foco del teclado', async () => {
    const { html, scrollBy } = crear();

    (html.querySelector('.juegos') as HTMLElement).dispatchEvent(new Event('focusin'));
    await vi.advanceTimersByTimeAsync(8000);

    expect(scrollBy).not.toHaveBeenCalled();
  });

  it('si la persona lo toca, espera unos segundos antes de seguir solo', async () => {
    const { html, scrollBy } = crear();

    (html.querySelector('.juegos') as HTMLElement).dispatchEvent(new Event('pointerdown'));
    await vi.advanceTimersByTimeAsync(7000);
    expect(scrollBy).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(4000);
    expect(scrollBy).toHaveBeenCalled();
  });

  it('al llegar al final vuelve al principio', async () => {
    const { scrollBy, scrollTo, mover } = crear();
    mover(ANCHO_TOTAL - ANCHO_VISIBLE);

    await vi.advanceTimersByTimeAsync(3600);

    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ left: 0 }));
    expect(scrollBy).not.toHaveBeenCalled();
  });

  it('con movimiento reducido no se desliza solo', async () => {
    const { scrollBy, scrollTo } = crear({ movimientoReducido: true });

    await vi.advanceTimersByTimeAsync(20000);

    expect(scrollBy).not.toHaveBeenCalled();
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
