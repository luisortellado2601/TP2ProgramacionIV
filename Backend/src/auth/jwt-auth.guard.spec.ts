import { jest } from '@jest/globals';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Model, Types } from 'mongoose';
import type { UsuarioDocument } from '../usuarios/usuario.schema.js';
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
  const idValido = new Types.ObjectId().toString();
  const verifyAsync = jest.fn<(token: string) => Promise<unknown>>();
  const exec = jest.fn<() => Promise<unknown>>();
  const select = jest.fn(() => ({ exec }));
  const findOne = jest.fn((_filtro: unknown) => ({ select }));
  const guard = new JwtAuthGuard(
    new Reflector(),
    { verifyAsync } as unknown as JwtService,
    { findOne } as unknown as Model<UsuarioDocument>,
  );

  beforeEach(() => {
    verifyAsync.mockReset();
    exec.mockReset().mockResolvedValue({ _id: idValido, habilitado: true });
    findOne.mockClear();
  });

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

  it('responde 401 "deshabilitado" si el usuario fue deshabilitado, aunque su token siga vigente', async () => {
    verifyAsync.mockResolvedValue({ sub: idValido, perfil: 'usuario' });
    exec.mockResolvedValue({ _id: idValido, habilitado: false });
    const request: Partial<RequestAutenticada> = {
      headers: { authorization: 'Bearer vigente' },
    };

    await expect(
      guard.canActivate(contexto(RutaPrivada, request)),
    ).rejects.toThrow('El usuario se encuentra deshabilitado');
    expect(findOne).toHaveBeenCalledWith({ _id: idValido });
    expect(request.usuario).toBeUndefined();
  });

  it('responde 401 si el usuario ya no existe, aunque su token siga vigente', async () => {
    verifyAsync.mockResolvedValue({ sub: idValido, perfil: 'usuario' });
    exec.mockResolvedValue(null);
    const request: Partial<RequestAutenticada> = {
      headers: { authorization: 'Bearer vigente' },
    };

    await expect(
      guard.canActivate(contexto(RutaPrivada, request)),
    ).rejects.toThrow('La sesión ya no es válida');
    expect(request.usuario).toBeUndefined();
  });

  it('responde 401 si el sub del token no es un id válido, sin consultar la base', async () => {
    verifyAsync.mockResolvedValue({ sub: 'abc123', perfil: 'usuario' });
    const request = { headers: { authorization: 'Bearer raro' } };

    await expect(
      guard.canActivate(contexto(RutaPrivada, request)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(findOne).not.toHaveBeenCalled();
  });

  it('con token válido y usuario habilitado deja pasar y guarda el payload en la request', async () => {
    const payload = { sub: idValido, perfil: 'usuario' };
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
