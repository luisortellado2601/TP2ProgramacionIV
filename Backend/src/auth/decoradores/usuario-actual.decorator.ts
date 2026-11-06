import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestAutenticada } from '../payload-token.js';

// Entrega el id del usuario dueño del token (el `sub`), ya verificado por
// JwtAuthGuard. Nunca se toma del body ni de la query: lo manda el cliente.
export const UsuarioActual = createParamDecorator(
  (_data: unknown, contexto: ExecutionContext): string => {
    const request = contexto.switchToHttp().getRequest<RequestAutenticada>();
    return request.usuario!.sub;
  },
);
