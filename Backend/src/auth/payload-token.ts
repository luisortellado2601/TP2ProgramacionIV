import type { Request } from 'express';
import { PerfilUsuario } from '../usuarios/usuario.schema.js';

// Lo que viaja firmado dentro del JWT (ver AuthService.construirRespuesta).
export interface PayloadToken {
  sub: string;
  correo: string;
  nombreUsuario: string;
  perfil: PerfilUsuario;
  iat: number;
  exp: number;
}

// Request en la que JwtAuthGuard deja el payload ya verificado.
export type RequestAutenticada = Request & { usuario?: PayloadToken };
