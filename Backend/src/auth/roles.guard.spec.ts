import { jest } from '@jest/globals';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Types } from 'mongoose';
import { RolesGuard } from './roles.guard.js';
import { Roles } from './decoradores/roles.decorator.js';
import { PerfilUsuario } from '../usuarios/usuario.schema.js';
import type { RequestAutenticada } from './payload-token.js';

class RutaLibre {
  metodo() {}
}
@Roles(PerfilUsuario.ADMINISTRADOR)
class RutaDeAdmin {
  metodo() {}
}

function contexto(
  clase: typeof RutaLibre,
  request: Partial<RequestAutenticada>,
): ExecutionContext {
  return {
    getHandler: () => Reflect.get(clase.prototype, 'metodo') as () => void,
    getClass: () => clase,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const id = new Types.ObjectId().toString();
  const findById = jest.fn();
  const guard = new RolesGuard(new Reflector(), { findById } as never);
  const request = { usuario: { sub: id } } as Partial<RequestAutenticada>;

  const usuarioEnBase = (usuario: unknown) =>
    findById.mockReturnValue({ exec: () => Promise.resolve(usuario) });

  beforeEach(() => findById.mockReset());

  it('deja pasar las rutas sin @Roles() sin consultar la base', async () => {
    await expect(guard.canActivate(contexto(RutaLibre, request))).resolves.toBe(
      true,
    );
    expect(findById).not.toHaveBeenCalled();
  });

  it('deja pasar a un administrador habilitado', async () => {
    usuarioEnBase({ perfil: PerfilUsuario.ADMINISTRADOR, habilitado: true });

    await expect(
      guard.canActivate(contexto(RutaDeAdmin, request)),
    ).resolves.toBe(true);
  });

  it('responde 403 a un usuario común', async () => {
    usuarioEnBase({ perfil: PerfilUsuario.USUARIO, habilitado: true });

    await expect(
      guard.canActivate(contexto(RutaDeAdmin, request)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('responde 401 si el administrador fue deshabilitado, aunque su token siga vigente', async () => {
    usuarioEnBase({ perfil: PerfilUsuario.ADMINISTRADOR, habilitado: false });

    await expect(
      guard.canActivate(contexto(RutaDeAdmin, request)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('responde 401 si el usuario del token ya no existe', async () => {
    usuarioEnBase(null);

    await expect(
      guard.canActivate(contexto(RutaDeAdmin, request)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('responde 401 si la request no trae usuario autenticado', async () => {
    await expect(
      guard.canActivate(contexto(RutaDeAdmin, {})),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(findById).not.toHaveBeenCalled();
  });
});
