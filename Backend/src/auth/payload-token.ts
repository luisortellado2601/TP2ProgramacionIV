import type { Request } from 'express';
import { PerfilUsuario } from '../usuarios/usuario.schema.js';

export interface PayloadToken {
  sub: string;
  correo: string;
  nombreUsuario: string;
  perfil: PerfilUsuario;
  iat: number;
  exp: number;
}

export type RequestAutenticada = Request & { usuario?: PayloadToken };
