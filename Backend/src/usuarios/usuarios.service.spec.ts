import { jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { UsuariosService } from './usuarios.service.js';
import { Usuario } from './usuario.schema.js';
import { AuthService } from '../auth/auth.service.js';
import type { RegistroDto } from '../auth/dto/registro.dto.js';

describe('UsuariosService', () => {
  const id = new Types.ObjectId();
  const usuarioBase = {
    _id: id,
    nombre: 'Ana',
    apellido: 'Gómez',
    correo: 'ana@mail.com',
    nombreUsuario: 'ana',
    contrasena: 'hash-secreto',
    perfil: 'usuario',
    habilitado: true,
  };

  const find = jest.fn();
  const findByIdAndUpdate = jest.fn();
  const crearUsuario = jest.fn<() => Promise<unknown>>();
  let service: UsuariosService;

  const resolver = (valor: unknown) => ({ exec: () => Promise.resolve(valor) });

  beforeEach(async () => {
    find.mockReset();
    findByIdAndUpdate.mockReset();
    crearUsuario.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        {
          provide: getModelToken(Usuario.name),
          useValue: { find, findByIdAndUpdate },
        },
        { provide: AuthService, useValue: { crearUsuario } },
      ],
    }).compile();
    service = module.get(UsuariosService);
  });

  it('listar devuelve los usuarios sin el hash de la contraseña', async () => {
    find.mockReturnValue({
      sort: () => resolver([usuarioBase]),
    });

    const usuarios = await service.listar();

    expect(usuarios).toHaveLength(1);
    expect(usuarios[0].id).toBe(id.toString());
    expect(usuarios[0]).not.toHaveProperty('contrasena');
  });

  it('crear delega en AuthService y no devuelve token ni contraseña', async () => {
    crearUsuario.mockResolvedValue({ ...usuarioBase, perfil: 'administrador' });

    const respuesta = await service.crear({ perfil: 'administrador' } as RegistroDto);

    expect(crearUsuario).toHaveBeenCalled();
    expect(respuesta.perfil).toBe('administrador');
    expect(respuesta).not.toHaveProperty('contrasena');
    expect(respuesta).not.toHaveProperty('token');
  });

  it('deshabilitar marca habilitado: false (baja lógica)', async () => {
    findByIdAndUpdate.mockReturnValue(
      resolver({ ...usuarioBase, habilitado: false }),
    );
    const otroAdmin = new Types.ObjectId().toString();

    const respuesta = await service.deshabilitar(id.toString(), otroAdmin);

    expect(findByIdAndUpdate).toHaveBeenCalledWith(
      id.toString(),
      { habilitado: false },
      expect.anything(),
    );
    expect(respuesta.habilitado).toBe(false);
  });

  it('deshabilitar rechaza (400) que un administrador se deshabilite a sí mismo', async () => {
    await expect(
      service.deshabilitar(id.toString(), id.toString()),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('habilitar marca habilitado: true', async () => {
    findByIdAndUpdate.mockReturnValue(resolver(usuarioBase));

    const respuesta = await service.habilitar(id.toString());

    expect(findByIdAndUpdate).toHaveBeenCalledWith(
      id.toString(),
      { habilitado: true },
      expect.anything(),
    );
    expect(respuesta.habilitado).toBe(true);
  });

  it('responde 400 con un id inválido y 404 si el usuario no existe', async () => {
    await expect(service.habilitar('no-es-un-id')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    findByIdAndUpdate.mockReturnValue(resolver(null));
    await expect(service.habilitar(id.toString())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
