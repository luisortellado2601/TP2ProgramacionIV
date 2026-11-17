import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { PerfilUsuario } from '../../usuarios/usuario.schema.js';
import { ROLES, RolesGuard } from '../roles.guard.js';

export const Roles = (...roles: PerfilUsuario[]) =>
  applyDecorators(SetMetadata(ROLES, roles), UseGuards(RolesGuard));
