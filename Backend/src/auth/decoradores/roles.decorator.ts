import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { PerfilUsuario } from '../../usuarios/usuario.schema.js';
import { ROLES, RolesGuard } from '../roles.guard.js';

// Restringe una ruta (o un controller entero) a los perfiles indicados:
// 403 si el usuario tiene otro perfil. Activa RolesGuard por sí mismo; el
// módulo del controller debe registrar el modelo Usuario (MongooseModule.forFeature).
export const Roles = (...roles: PerfilUsuario[]) =>
  applyDecorators(SetMetadata(ROLES, roles), UseGuards(RolesGuard));
