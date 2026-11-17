import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Usuario, UsuarioDocument } from '../usuarios/usuario.schema.js';
import { ES_PUBLICA } from './decoradores/public.decorator.js';
import type { PayloadToken, RequestAutenticada } from './payload-token.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    @InjectModel(Usuario.name)
    private readonly usuarioModel: Model<UsuarioDocument>,
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

    let payload: PayloadToken;
    try {
      payload = await this.jwtService.verifyAsync<PayloadToken>(token);
    } catch {
      throw new UnauthorizedException('El token es inválido o está vencido');
    }

    await this.exigirUsuarioHabilitado(payload.sub);

    request.usuario = payload;
    return true;
  }

  private async exigirUsuarioHabilitado(usuarioId: string): Promise<void> {
    const usuario = Types.ObjectId.isValid(usuarioId)
      ? await this.usuarioModel
          .findOne({ _id: usuarioId, habilitado: true })
          .select('_id')
          .exec()
      : null;
    if (!usuario) {
      throw new UnauthorizedException('La sesión ya no es válida');
    }
  }

  private extraerToken(request: RequestAutenticada): string | undefined {
    const [tipo, token] = request.headers.authorization?.split(' ') ?? [];
    return tipo === 'Bearer' && token ? token : undefined;
  }
}
