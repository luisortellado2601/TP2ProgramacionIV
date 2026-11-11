import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  PerfilUsuario,
  Usuario,
  UsuarioDocument,
} from '../usuarios/usuario.schema.js';
import type { RequestAutenticada } from './payload-token.js';

// Clave de metadata donde @Roles() guarda los perfiles permitidos.
export const ROLES = 'roles';

// Se ejecuta después de JwtAuthGuard (que ya dejó el payload en la request).
// El perfil y el estado se leen de la base y no del token: así, quitarle el
// rol a un administrador o deshabilitarlo surte efecto en el acto, sin esperar
// a que venza su JWT.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectModel(Usuario.name)
    private readonly usuarioModel: Model<UsuarioDocument>,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const rolesPermitidos = this.reflector.getAllAndOverride<
      PerfilUsuario[] | undefined
    >(ROLES, [contexto.getHandler(), contexto.getClass()]);
    if (!rolesPermitidos?.length) {
      return true;
    }

    const request = contexto.switchToHttp().getRequest<RequestAutenticada>();
    const usuarioId = request.usuario?.sub;
    const usuario =
      usuarioId && Types.ObjectId.isValid(usuarioId)
        ? await this.usuarioModel.findById(usuarioId).exec()
        : null;
    if (!usuario || !usuario.habilitado) {
      throw new UnauthorizedException('La sesión ya no es válida');
    }

    if (!rolesPermitidos.includes(usuario.perfil)) {
      throw new ForbiddenException(
        'No tenés permisos para realizar esta acción',
      );
    }
    return true;
  }
}
