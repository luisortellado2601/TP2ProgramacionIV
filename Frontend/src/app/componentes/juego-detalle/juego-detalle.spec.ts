import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { JuegoDetalle } from './juego-detalle';

describe('JuegoDetalle', () => {
  async function abrir(id: string) {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'juegos/:id', component: JuegoDetalle }])],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/juegos/${id}`, JuegoDetalle);
    harness.detectChanges();
    return harness.routeNativeElement as HTMLElement;
  }

  it('muestra título, desarrollador, año y sinopsis del juego', async () => {
    const html = await abrir('elden-ring');

    expect(html.querySelector('h2')?.textContent).toContain('Elden Ring');
    expect(html.textContent).toContain('FromSoftware, 2022');
    expect(html.querySelector('.juego__sinopsis')?.textContent).toContain('Tierras Intermedias');
  });

  it('muestra la ficha técnica: peso, plataformas y géneros', async () => {
    const html = await abrir('elden-ring');

    expect(html.querySelector('.juego__peso')?.textContent).toContain('60 GB');
    const chips = Array.from(html.querySelectorAll('.juego__chips li')).map((li) =>
      li.textContent?.trim(),
    );
    expect(chips).toEqual(
      expect.arrayContaining(['PC', 'PS5', 'Xbox Series X|S', 'Acción', 'Rol']),
    );
  });

  it('muestra la carátula del juego con un texto alternativo', async () => {
    const html = await abrir('hades');

    const portada = html.querySelector('.juego__portada img') as HTMLImageElement;
    expect(portada.src).toContain('library_600x900.jpg');
    expect(portada.alt).toBe('Imagen de Hades');
  });

  it('usa la imagen propia del juego cuando no sale de Steam (ej. League of Legends)', async () => {
    const html = await abrir('league-of-legends');

    const portada = html.querySelector('.juego__portada img') as HTMLImageElement;
    expect(portada.src).toContain('ddragon.leagueoflegends.com');
    expect(html.querySelector('.juego__peso')?.textContent).toContain('20 GB');
  });

  it('tiene un botón para volver a publicaciones', async () => {
    const html = await abrir('hades');

    const volver = html.querySelector('a.detalle__volver');
    expect(volver?.getAttribute('href')).toBe('/publicaciones');
  });

  it('si el juego no existe, lo avisa y no muestra ninguna ficha', async () => {
    const html = await abrir('no-existe');

    expect(html.textContent).toContain('Juego no disponible');
    expect(html.querySelector('.juego')).toBeNull();
  });
});
