import { jest } from '@jest/globals';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { Public } from './decoradores/public.decorator.js';
import type { RequestAutenticada } from './payload-token.js';

class RutaPrivada {
  metodo() {}
}
class RutaPublica {
  @Public()
  metodo() {}
}

function contexto(
  clase: typeof RutaPrivada,
  request: Partial<RequestAutenticada>,
): ExecutionContext {
  return {
    getHandler: () => Reflect.get(clase.prototype, 'metodo') as () => void,
    getClass: () => clase,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  const verifyAsync = jest.fn<(token: string) => Promise<unknown>>();
  const guard = new JwtAuthGuard(new Reflector(), {
    verifyAsync,
  } as unknown as JwtService);

  beforeEach(() => verifyAsync.mockReset());

  it('deja pasar las rutas @Public() sin token', async () => {
    await expect(
      guard.canActivate(contexto(RutaPublica, { headers: {} })),
    ).resolves.toBe(true);
    expect(verifyAsync).not.toHaveBeenCalled();
  });

  it('responde 401 si falta el encabezado Authorization', async () => {
    await expect(
      guard.canActivate(contexto(RutaPrivada, { headers: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('responde 401 si el esquema no es Bearer', async () => {
    const request = { headers: { authorization: 'Basic abc' } };
    await expect(
      guard.canActivate(contexto(RutaPrivada, request)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('responde 401 si el token es inválido o está vencido', async () => {
    verifyAsync.mockRejectedValue(new Error('jwt expired'));
    const request = { headers: { authorization: 'Bearer vencido' } };
    await expect(
      guard.canActivate(contexto(RutaPrivada, request)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('con token válido deja pasar y guarda el payload en la request', async () => {
    const payload = { sub: 'abc123', perfil: 'usuario' };
    verifyAsync.mockResolvedValue(payload);
    const request: Partial<RequestAutenticada> = {
      headers: { authorization: 'Bearer valido' },
    };

    await expect(
      guard.canActivate(contexto(RutaPrivada, request)),
    ).resolves.toBe(true);
    expect(verifyAsync).toHaveBeenCalledWith('valido');
    expect(request.usuario).toEqual(payload);
  });
});
