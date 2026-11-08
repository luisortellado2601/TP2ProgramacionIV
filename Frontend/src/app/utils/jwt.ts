// Un JWT es header.payload.firma en base64url; el payload se puede leer sin la
// clave (no hace falta validarlo acá, eso ya lo hizo el back). Sirve para saber
// cuándo vence el token y programar el aviso de "sesión por vencer".
export interface PayloadToken {
  sub: string;
  correo: string;
  nombreUsuario: string;
  perfil: string;
  iat: number;
  exp: number;
}

export function decodificarPayloadToken(token: string): PayloadToken | null {
  const partes = token.split('.');
  if (partes.length !== 3) {
    return null;
  }
  try {
    const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64)) as PayloadToken;
  } catch {
    return null;
  }
}
