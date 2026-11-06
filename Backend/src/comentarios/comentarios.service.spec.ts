import { jest } from '@jest/globals';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ComentariosService } from './comentarios.service.js';
import { Comentario } from './comentario.schema.js';
import { Publicacion } from '../publicaciones/publicacion.schema.js';
import { Usuario } from '../usuarios/usuario.schema.js';

describe('ComentariosService.actualizar', () => {
  const autorId = new Types.ObjectId();
  const otroId = new Types.ObjectId();
  const publicacionId = new Types.ObjectId();
  const comentarioId = new Types.ObjectId();

  const autor = {
    _id: autorId,
    nombre: 'Ana',
    apellido: 'Gómez',
    nombreUsuario: 'ana',
  };
  const save = jest.fn<() => Promise<void>>();
  const comentarioModel = { findById: jest.fn() };
  const publicacionModel = { findById: jest.fn() };
  const usuarioModel = { findById: jest.fn() };
  let service: ComentariosService;

  const devolver = (modelo: { findById: jest.Mock }, valor: unknown) =>
    modelo.findById.mockReturnValue({ exec: () => Promise.resolve(valor) });

  const crearComentario = (cambios: object = {}) => ({
    _id: comentarioId,
    publicacion: publicacionId,
    usuario: autorId,
    mensaje: 'original',
    fecha: new Date(),
    modificado: false,
    eliminado: false,
    save,
    ...cambios,
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    save.mockResolvedValue();
    devolver(publicacionModel, { _id: publicacionId, eliminada: false });
    devolver(usuarioModel, autor);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComentariosService,
        { provide: getModelToken(Comentario.name), useValue: comentarioModel },
        { provide: getModelToken(Publicacion.name), useValue: publicacionModel },
        { provide: getModelToken(Usuario.name), useValue: usuarioModel },
      ],
    }).compile();
    service = module.get(ComentariosService);
  });

  it('el autor edita: cambia el mensaje y marca modificado: true', async () => {
    const comentario = crearComentario();
    devolver(comentarioModel, comentario);

    const respuesta = await service.actualizar(
      comentarioId.toString(),
      autorId.toString(),
      { mensaje: 'editado' },
    );

    expect(save).toHaveBeenCalled();
    expect(respuesta.mensaje).toBe('editado');
    expect(respuesta.modificado).toBe(true);
    expect(respuesta.autor.id).toBe(autorId.toString());
  });

  it('responde 403 si no es el autor y no guarda nada', async () => {
    devolver(comentarioModel, crearComentario());

    await expect(
      service.actualizar(comentarioId.toString(), otroId.toString(), {
        mensaje: 'x',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(save).not.toHaveBeenCalled();
  });

  it('responde 404 si el comentario no existe o está eliminado', async () => {
    devolver(comentarioModel, null);
    await expect(
      service.actualizar(comentarioId.toString(), autorId.toString(), {
        mensaje: 'x',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    devolver(comentarioModel, crearComentario({ eliminado: true }));
    await expect(
      service.actualizar(comentarioId.toString(), autorId.toString(), {
        mensaje: 'x',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('responde 404 si la publicación fue dada de baja', async () => {
    devolver(comentarioModel, crearComentario());
    devolver(publicacionModel, { _id: publicacionId, eliminada: true });

    await expect(
      service.actualizar(comentarioId.toString(), autorId.toString(), {
        mensaje: 'x',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('responde 400 si el id del comentario no es válido', async () => {
    await expect(
      service.actualizar('no-es-un-id', autorId.toString(), { mensaje: 'x' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(comentarioModel.findById).not.toHaveBeenCalled();
  });
});
