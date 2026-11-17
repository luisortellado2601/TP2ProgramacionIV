const CLAVE_ARRANQUE = 'nextplay_arranque_visto';

export function arranqueYaVisto(): boolean {
  try {
    return sessionStorage.getItem(CLAVE_ARRANQUE) === '1';
  } catch {
    return false;
  }
}

export function marcarArranqueVisto(): void {
  try {
    sessionStorage.setItem(CLAVE_ARRANQUE, '1');
  } catch {}
}

export function reiniciarArranque(): void {
  try {
    sessionStorage.removeItem(CLAVE_ARRANQUE);
  } catch {}
}
