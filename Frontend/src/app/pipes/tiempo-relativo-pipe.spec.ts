import { TiempoRelativoPipe } from './tiempo-relativo-pipe';

describe('TiempoRelativoPipe', () => {
  const pipe = new TiempoRelativoPipe();
  const ahora = new Date(2026, 10, 13, 12, 0, 0).getTime();
  const haceMs = (ms: number) => new Date(ahora - ms).toISOString();

  it('menos de un minuto', () => {
    expect(pipe.transform(haceMs(30_000), ahora)).toBe('hace un momento');
  });

  it('minutos y horas', () => {
    expect(pipe.transform(haceMs(5 * 60_000), ahora)).toBe('hace 5 min');
    expect(pipe.transform(haceMs(3 * 3_600_000), ahora)).toBe('hace 3 h');
  });

  it('días en singular y plural', () => {
    expect(pipe.transform(haceMs(24 * 3_600_000), ahora)).toBe('hace 1 día');
    expect(pipe.transform(haceMs(3 * 24 * 3_600_000), ahora)).toBe('hace 3 días');
  });

  it('pasada una semana muestra la fecha', () => {
    const fecha = new Date(2026, 10, 1, 9, 0, 0);
    expect(pipe.transform(fecha, ahora)).toBe('01/11/26');
  });

  it('fecha futura se trata como recién', () => {
    expect(pipe.transform(new Date(ahora + 60_000), ahora)).toBe('hace un momento');
  });

  it('vacía o inválida devuelve texto vacío', () => {
    expect(pipe.transform(null, ahora)).toBe('');
    expect(pipe.transform('no-es-fecha', ahora)).toBe('');
  });
});
