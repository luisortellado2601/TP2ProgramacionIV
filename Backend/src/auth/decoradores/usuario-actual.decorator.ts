import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestAutenticada } from '../payload-token.js';

export const UsuarioActual = createParamDecorator(
  (_data: unknown, contexto: ExecutionContext): string => {
    const request = contexto.switchToHttp().getRequest<RequestAutenticada>();
    return request.usuario!.sub;
  },
);
