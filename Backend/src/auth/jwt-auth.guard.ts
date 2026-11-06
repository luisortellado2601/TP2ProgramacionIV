import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ES_PUBLICA } from './decoradores/public.decorator.js';
import type { PayloadToken, RequestAutenticada } from './payload-token.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const esPublica = this.reflector.getAllAndOverride<boolean | undefined>(
      ES_PUBLICA,
      [contexto.getHandler(), contexto.getClass()],
    );
    if (esPublica) {
      return true;
    }

    const request = contexto.switchToHttp().getRequest<RequestAutenticada>();
    const token = this.extraerToken(request);
    if (!token) {
      throw new UnauthorizedException('Falta el token de autenticación');
    }

    try {
      // Verifica la firma y el vencimiento (lanza si no se cumplen).
      request.usuario = await this.jwtService.verifyAsync<PayloadToken>(token);
    } catch {
      throw new UnauthorizedException('El token es inválido o está vencido');
    }
    return true;
  }

  // Espera el encabezado `Authorization: Bearer <token>`.
  private extraerToken(request: RequestAutenticada): string | undefined {
    const [tipo, token] = request.headers.authorization?.split(' ') ?? [];
    return tipo === 'Bearer' && token ? token : undefined;
  }
}
