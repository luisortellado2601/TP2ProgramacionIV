import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { PublicacionesService } from './publicaciones.service.js';
import { Publicacion } from './publicacion.schema.js';
import { Usuario } from '../usuarios/usuario.schema.js';
import { Comentario } from '../comentarios/comentario.schema.js';
import { AlmacenamientoService } from '../almacenamiento/almacenamiento.service.js';

describe('PublicacionesService', () => {
  let service: PublicacionesService;
  let publicacionModel: {
    create: jest.Mock;
    findById: jest.Mock;
    aggregate: jest.Mock;
    countDocuments: jest.Mock;
    findOneAndUpdate: jest.Mock;
  };
  let usuarioModel: { findById: jest.Mock };

  beforeEach(async () => {
    publicacionModel = {
      create: jest.fn(),
      findById: jest.fn(),
      aggregate: jest.fn(),
      countDocuments: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };
    usuarioModel = { findById: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicacionesService,
        {
          provide: getModelToken(Publicacion.name),
          useValue: publicacionModel,
        },
        {
          provide: getModelToken(Usuario.name),
          useValue: usuarioModel,
        },
        {
          provide: getModelToken(Comentario.name),
          useValue: { collection: { name: 'comentarios' } },
        },
        {
          provide: AlmacenamientoService,
          useValue: {
            subirImagen: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PublicacionesService>(PublicacionesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('obtener', () => {
    const aggregate = (resultado: unknown[]) =>
      publicacionModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(resultado),
      });

    it('devuelve la publicación con su autor y cantidad de likes', async () => {
      const id = new Types.ObjectId();
      const autorId = new Types.ObjectId();
      const fecha = new Date();
      aggregate([
        {
          _id: id,
          titulo: 'Título',
          mensaje: 'Mensaje',
          fecha,
          likes: [autorId],
          cantidadLikes: 1,
          cantidadComentarios: 4,
          autor: {
            _id: autorId,
            nombre: 'Ana',
            apellido: 'Pérez',
            nombreUsuario: 'ana',
          },
        },
      ]);

      const resultado = await service.obtener(id.toString());

      expect(resultado).toEqual({
        id: id.toString(),
        titulo: 'Título',
        mensaje: 'Mensaje',
        imagenUrl: undefined,
        fecha,
        likes: [autorId.toString()],
        cantidadLikes: 1,
        cantidadComentarios: 4,
        autor: {
          id: autorId.toString(),
          nombre: 'Ana',
          apellido: 'Pérez',
          nombreUsuario: 'ana',
          imagenPerfilUrl: undefined,
        },
      });
    });

    it('el pipeline cuenta solo los comentarios no eliminados de la publicación', async () => {
      aggregate([]);
      await service.obtener(new Types.ObjectId().toString()).catch(() => null);

      const pipeline = publicacionModel.aggregate.mock.calls[0][0] as Record<
        string,
        any
      >[];
      const union = pipeline.find((etapa) => etapa.$lookup?.as === 'conteoComentarios');
      expect(union?.$lookup).toMatchObject({
        from: 'comentarios',
        localField: '_id',
        foreignField: 'publicacion',
        pipeline: [{ $match: { eliminado: false } }, { $count: 'cantidad' }],
      });
    });

    it('responde 400 si el id no es válido, sin consultar la base', async () => {
      await expect(service.obtener('no-es-un-id')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(publicacionModel.aggregate).not.toHaveBeenCalled();
    });

    it('responde 404 si no existe o fue dada de baja', async () => {
      aggregate([]);

      await expect(
        service.obtener(new Types.ObjectId().toString()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe.each([
    ['darLike', 'Ya le diste me gusta a esta publicación'],
    ['quitarLike', 'No le diste me gusta a esta publicación'],
  ] as const)('%s', (metodo, mensajeConflicto) => {
    const usuarioId = new Types.ObjectId().toString();
    const publicacionId = new Types.ObjectId().toString();

    // `findById` devuelve, en orden, lo que se indique en cada consulta.
    const publicacionesEncontradas = (...eliminadas: boolean[]) => {
      for (const eliminada of eliminadas) {
        publicacionModel.findById.mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue({ eliminada }),
        });
      }
    };
    const actualizacion = (resultado: unknown) =>
      publicacionModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(resultado),
      });

    beforeEach(() => {
      usuarioModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: usuarioId }),
      });
    });

    it('responde 404 si la publicación está dada de baja', async () => {
      publicacionesEncontradas(true);

      await expect(service[metodo](publicacionId, usuarioId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(publicacionModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('responde 409 si la publicación sigue activa pero el like no corresponde', async () => {
      publicacionesEncontradas(false, false);
      actualizacion(null);

      const promesa = service[metodo](publicacionId, usuarioId);

      await expect(promesa).rejects.toBeInstanceOf(ConflictException);
      await expect(promesa).rejects.toThrow(mensajeConflicto);
    });

    it('responde 404 (y no 409) si la baja ocurre entre la comprobación y la actualización', async () => {
      publicacionesEncontradas(false, true);
      actualizacion(null);

      await expect(service[metodo](publicacionId, usuarioId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
