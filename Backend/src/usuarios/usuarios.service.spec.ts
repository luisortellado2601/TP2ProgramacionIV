import { jest } from '@jest/globals';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { UsuariosService } from './usuarios.service.js';
import { Usuario } from './usuario.schema.js';
import { AuthService } from '../auth/auth.service.js';
import { AlmacenamientoService } from '../almacenamiento/almacenamiento.service.js';
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
  const findOne = jest.fn();
  const subirImagen = jest.fn<() => Promise<string>>();
  const crearUsuario = jest.fn<() => Promise<unknown>>();
  let service: UsuariosService;

  const resolver = (valor: unknown) => ({ exec: () => Promise.resolve(valor) });

  beforeEach(async () => {
    find.mockReset();
    findByIdAndUpdate.mockReset();
    findOne.mockReset();
    subirImagen.mockReset();
    crearUsuario.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        {
          provide: getModelToken(Usuario.name),
          useValue: { find, findByIdAndUpdate, findOne },
        },
        { provide: AuthService, useValue: { crearUsuario } },
        { provide: AlmacenamientoService, useValue: { subirImagen } },
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

    const respuesta = await service.crear({
      perfil: 'administrador',
    } as RegistroDto);

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

  describe('actualizarPerfil (edición del propio perfil)', () => {
    const dto = {
      nombre: 'Ana María',
      apellido: 'Gómez',
      fechaNacimiento: '1999-05-20',
    };
    const actualizado = { ...usuarioBase, nombre: 'Ana María' };

    it('actualiza nombre, apellido y fecha de nacimiento y devuelve el usuario sin contraseña', async () => {
      findOne.mockReturnValue(resolver(usuarioBase));
      findByIdAndUpdate.mockReturnValue(resolver(actualizado));

      const respuesta = await service.actualizarPerfil(id.toString(), dto);

      expect(findByIdAndUpdate).toHaveBeenCalledWith(
        id.toString(),
        {
          $set: {
            nombre: 'Ana María',
            apellido: 'Gómez',
            fechaNacimiento: new Date('1999-05-20'),
          },
        },
        expect.anything(),
      );
      expect(respuesta.nombre).toBe('Ana María');
      expect(respuesta).not.toHaveProperty('contrasena');
      expect(subirImagen).not.toHaveBeenCalled();
    });

    it('solo busca usuarios habilitados', async () => {
      findOne.mockReturnValue(resolver(usuarioBase));
      findByIdAndUpdate.mockReturnValue(resolver(actualizado));

      await service.actualizarPerfil(id.toString(), dto);

      expect(findOne).toHaveBeenCalledWith({
        _id: id.toString(),
        habilitado: true,
      });
    });

    it('con imagen nueva la sube a la carpeta de perfiles y guarda su URL', async () => {
      findOne.mockReturnValue(resolver(usuarioBase));
      findByIdAndUpdate.mockReturnValue(resolver(actualizado));
      subirImagen.mockResolvedValue('https://storage/perfiles/nueva.png');

      await service.actualizarPerfil(id.toString(), {
        ...dto,
        imagenPerfil: 'data:image/png;base64,AAAA',
      });

      expect(subirImagen).toHaveBeenCalledWith(
        'data:image/png;base64,AAAA',
        'perfiles',
      );
      const { $set } = findByIdAndUpdate.mock.calls[0][1] as {
        $set: Record<string, unknown>;
      };
      expect($set['imagenPerfilUrl']).toBe(
        'https://storage/perfiles/nueva.png',
      );
    });

    it('la descripción vacía la borra y, si no viene, no se toca', async () => {
      findOne.mockReturnValue(resolver(usuarioBase));
      findByIdAndUpdate.mockReturnValue(resolver(actualizado));

      await service.actualizarPerfil(id.toString(), {
        ...dto,
        descripcion: '',
      });
      const conVacia = findByIdAndUpdate.mock.calls[0][1] as {
        $set: Record<string, unknown>;
      };
      expect(conVacia.$set['descripcion']).toBe('');

      await service.actualizarPerfil(id.toString(), dto);
      const sinCampo = findByIdAndUpdate.mock.calls[1][1] as {
        $set: Record<string, unknown>;
      };
      expect(sinCampo.$set).not.toHaveProperty('descripcion');
    });

    it('nunca modifica correo, nombre de usuario, contraseña, perfil ni habilitado', async () => {
      findOne.mockReturnValue(resolver(usuarioBase));
      findByIdAndUpdate.mockReturnValue(resolver(actualizado));

      await service.actualizarPerfil(id.toString(), {
        ...dto,
        descripcion: 'Hola',
        imagenPerfil: 'data:image/png;base64,AAAA',
      });

      const { $set } = findByIdAndUpdate.mock.calls[0][1] as {
        $set: Record<string, unknown>;
      };
      for (const campo of [
        'correo',
        'nombreUsuario',
        'contrasena',
        'perfil',
        'habilitado',
      ]) {
        expect($set).not.toHaveProperty(campo);
      }
    });

    it('responde 401 si el usuario ya no existe o está deshabilitado, sin subir imagen ni actualizar', async () => {
      findOne.mockReturnValue(resolver(null));

      await expect(
        service.actualizarPerfil(id.toString(), {
          ...dto,
          imagenPerfil: 'data:image/png;base64,AAAA',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(subirImagen).not.toHaveBeenCalled();
      expect(findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('responde 401 con un id inválido', async () => {
      await expect(
        service.actualizarPerfil('no-es-un-id', dto),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(findOne).not.toHaveBeenCalled();
    });
  });
});
