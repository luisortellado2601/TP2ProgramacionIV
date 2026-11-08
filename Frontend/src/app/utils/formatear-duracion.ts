// Redondea hacia arriba para no mostrar "0 segundos" justo antes de vencer.
export function formatearDuracion(ms: number): string {
  const segundos = Math.max(1, Math.ceil(ms / 1000));
  if (segundos < 60) {
    return `${segundos} segundo${segundos === 1 ? '' : 's'}`;
  }
  const minutos = Math.ceil(segundos / 60);
  return `${minutos} minuto${minutos === 1 ? '' : 's'}`;
}
