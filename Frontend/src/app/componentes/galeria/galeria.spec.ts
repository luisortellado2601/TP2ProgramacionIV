import { TestBed } from '@angular/core/testing';
import { Galeria } from './galeria';

describe('Galeria', () => {
  function crear(imagenes: string[], opciones: { movimientoReducido?: boolean } = {}) {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance', 'Date'] });
    if (opciones.movimientoReducido) {
      vi.stubGlobal('matchMedia', () => ({ matches: true }));
    }
    const fixture = TestBed.createComponent(Galeria);
    fixture.componentRef.setInput('imagenes', imagenes);
    fixture.componentRef.setInput('titulo', 'Elden Ring');
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;
    const pista = html.querySelector('.galeria__pista') as HTMLElement;
    pista.scrollTo = vi.fn() as unknown as typeof pista.scrollTo;
    Object.defineProperty(pista, 'clientWidth', { configurable: true, value: 500 });
    return { fixture, html, pista };
  }

  const fotos = ['a.jpg', 'b.jpg', 'c.jpg'];

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('muestra una imagen por foto, con texto alternativo que dice cuál es', () => {
    const { html } = crear(fotos);

    const imgs = Array.from(html.querySelectorAll('img'));
    expect(imgs.map((i) => i.alt)).toEqual([
      'Imagen 1 de 3 de Elden Ring',
      'Imagen 2 de 3 de Elden Ring',
      'Imagen 3 de 3 de Elden Ring',
    ]);
  });

  it('solo la primera se carga de inmediato; el resto, de a una', () => {
    const { html } = crear(fotos);

    const imgs = Array.from(html.querySelectorAll('img'));
    expect(imgs[0].getAttribute('loading')).toBeNull();
    expect(imgs[1].getAttribute('loading')).toBe('lazy');
  });

  it('las flechas pasan a la imagen siguiente y a la anterior, dando la vuelta', () => {
    const { fixture, html, pista } = crear(fotos);
    const siguiente = html.querySelector('[aria-label="Imagen siguiente"]') as HTMLButtonElement;
    const anterior = html.querySelector('[aria-label="Imagen anterior"]') as HTMLButtonElement;

    siguiente.click();
    expect(pista.scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ left: 500 }));

    anterior.click();
    anterior.click();
    fixture.detectChanges();
    expect(pista.scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ left: 1000 }));
  });

  it('los puntos llevan a una imagen y marcan la actual', () => {
    const { fixture, html, pista } = crear(fotos);
    const puntos = () => Array.from(html.querySelectorAll('.galeria__punto'));

    (puntos()[2] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(pista.scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ left: 1000 }));
    expect(puntos()[2].getAttribute('aria-current')).toBe('true');
    expect(puntos()[0].getAttribute('aria-current')).toBeNull();
  });

  it('al deslizar con el dedo actualiza la imagen actual', () => {
    const { fixture, html, pista } = crear(fotos);
    Object.defineProperty(pista, 'scrollLeft', { configurable: true, value: 500 });

    pista.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(html.querySelectorAll('.galeria__punto')[1].getAttribute('aria-current')).toBe('true');
  });

  it('con una sola imagen no muestra flechas ni puntos', () => {
    const { html } = crear(['a.jpg']);

    expect(html.querySelector('.galeria__flecha')).toBeNull();
    expect(html.querySelector('.galeria__punto')).toBeNull();
  });

  it('pasa sola a la imagen siguiente cada pocos segundos y vuelve a la primera al terminar', async () => {
    const { pista } = crear(fotos);

    await vi.advanceTimersByTimeAsync(4400);
    expect(pista.scrollTo).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(200);
    expect(pista.scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ left: 500 }));

    await vi.advanceTimersByTimeAsync(4500);
    expect(pista.scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ left: 1000 }));

    await vi.advanceTimersByTimeAsync(4500);
    expect(pista.scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ left: 0 }));
  });

  it('se detiene mientras el mouse o el foco están encima, y sigue al sacarlos', async () => {
    const { html, pista } = crear(fotos);
    const seccion = html.querySelector('.galeria') as HTMLElement;

    seccion.dispatchEvent(new Event('mouseenter'));
    await vi.advanceTimersByTimeAsync(12000);
    expect(pista.scrollTo).not.toHaveBeenCalled();

    seccion.dispatchEvent(new Event('mouseleave'));
    await vi.advanceTimersByTimeAsync(4600);
    expect(pista.scrollTo).toHaveBeenCalled();
  });

  it('si la persona toca la galería o usa las flechas, espera antes de seguir sola', async () => {
    const { html, pista } = crear(fotos);

    (html.querySelector('.galeria') as HTMLElement).dispatchEvent(new Event('pointerdown'));
    await vi.advanceTimersByTimeAsync(8000);
    expect(pista.scrollTo).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2000);
    expect(pista.scrollTo).toHaveBeenCalled();
  });

  it('con movimiento reducido no avanza sola', async () => {
    const { pista } = crear(fotos, { movimientoReducido: true });

    await vi.advanceTimersByTimeAsync(30000);

    expect(pista.scrollTo).not.toHaveBeenCalled();
  });

  it('con una sola imagen no intenta avanzar', async () => {
    const { pista } = crear(['a.jpg']);

    await vi.advanceTimersByTimeAsync(30000);

    expect(pista.scrollTo).not.toHaveBeenCalled();
  });
});
