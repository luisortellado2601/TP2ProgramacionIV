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
