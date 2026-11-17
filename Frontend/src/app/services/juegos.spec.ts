import { TestBed } from '@angular/core/testing';
import { JuegosService } from './juegos';

describe('JuegosService', () => {
  let servicio: JuegosService;

  beforeEach(() => {
    servicio = TestBed.inject(JuegosService);
  });

  it('tiene juegos y todos los datos de la ficha completos', () => {
    const juegos = servicio.listar();

    expect(juegos.length).toBeGreaterThanOrEqual(8);
    for (const juego of juegos) {
      expect(juego.id, `id de ${juego.titulo}`).toMatch(/^[a-z0-9-]+$/);
      expect(juego.titulo).not.toBe('');
      expect(juego.desarrollador).not.toBe('');
      expect(juego.lanzamiento).toBeGreaterThan(1990);
      expect(juego.generos.length, `géneros de ${juego.titulo}`).toBeGreaterThan(0);
      expect(juego.plataformas.length, `plataformas de ${juego.titulo}`).toBeGreaterThan(0);
      expect(juego.peso, `peso de ${juego.titulo}`).toMatch(/^\d+ (GB|MB)$/);
      expect(juego.sinopsis.length, `sinopsis de ${juego.titulo}`).toBeGreaterThan(80);
      expect(juego.steamAppId || juego.portada, `imagen de ${juego.titulo}`).toBeTruthy();
    }
  });

  it('incluye los juegos más populares del momento', () => {
    const ids = servicio.listar().map((juego) => juego.id);

    expect(ids).toEqual(
      expect.arrayContaining(['fortnite', 'league-of-legends', 'counter-strike-2', 'valorant']),
    );
  });

  it('no repite ids (cada juego tiene su propia URL)', () => {
    const ids = servicio.listar().map((juego) => juego.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('obtiene un juego por id y devuelve undefined si no existe', () => {
    expect(servicio.obtener('elden-ring')?.titulo).toBe('Elden Ring');
    expect(servicio.obtener('no-existe')).toBeUndefined();
  });

  it('arma la URL de la carátula a partir del id de Steam', () => {
    const juego = servicio.obtener('elden-ring')!;

    expect(servicio.portada(juego)).toContain(`/${juego.steamAppId}/library_600x900.jpg`);
  });

  it('prefiere la imagen propia del juego a la de Steam', () => {
    const juego = servicio.obtener('valorant')!;

    expect(servicio.portada(juego)).toBe(juego.portada);
  });
});
