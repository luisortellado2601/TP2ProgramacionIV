import { jest } from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Types } from 'mongoose';
import { AuthService } from './auth.service.js';
import { PasswordHasher } from './password-hasher.js';
import { Usuario } from '../usuarios/usuario.schema.js';
import { AlmacenamientoService } from '../almacenamiento/almacenamiento.service.js';

describe('AuthService (autorizar / refrescar)', () => {
  const id = new Types.ObjectId();
  const usuarioBase = {
    _id: id,
    nombre: 'Ana',
    apellido: 'Gómez',
    correo: 'ana@mail.com',
    nombreUsuario: 'ana',
    perfil: 'usuario',
    habilitado: true,
  };

  const findById = jest.fn();
  const signAsync = jest.fn<() => Promise<string>>();
  let service: AuthService;

  const devolverUsuario = (usuario: unknown) =>
    findById.mockReturnValue({ exec: () => Promise.resolve(usuario) });

  beforeEach(async () => {
    findById.mockReset();
    signAsync.mockReset();
    signAsync.mockResolvedValue('token-nuevo');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken(Usuario.name), useValue: { findById } },
        { provide: PasswordHasher, useValue: {} },
        { provide: JwtService, useValue: { signAsync } },
        { provide: AlmacenamientoService, useValue: {} },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('autorizar devuelve los datos del usuario sin contraseña ni token', async () => {
    devolverUsuario(usuarioBase);

    const respuesta = await service.autorizar(id.toString());

    expect(respuesta.usuario.id).toBe(id.toString());
    expect(respuesta.usuario).not.toHaveProperty('contrasena');
    expect(respuesta).not.toHaveProperty('token');
  });

  it('refrescar devuelve el usuario y un token nuevo', async () => {
    devolverUsuario(usuarioBase);

    const respuesta = await service.refrescar(id.toString());

    expect(respuesta.token).toBe('token-nuevo');
    expect(signAsync).toHaveBeenCalledWith({
      sub: id.toString(),
      correo: 'ana@mail.com',
      nombreUsuario: 'ana',
      perfil: 'usuario',
    });
  });

  it('responde 401 si el usuario ya no existe', async () => {
    devolverUsuario(null);
    await expect(service.autorizar(id.toString())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(service.refrescar(id.toString())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('responde 401 si el usuario está deshabilitado', async () => {
    devolverUsuario({ ...usuarioBase, habilitado: false });
    await expect(service.refrescar(id.toString())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(signAsync).not.toHaveBeenCalled();
  });

  it('responde 401 (y no 500) si el id del token no es un ObjectId', async () => {
    await expect(service.autorizar('no-es-un-id')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(findById).not.toHaveBeenCalled();
  });
});
