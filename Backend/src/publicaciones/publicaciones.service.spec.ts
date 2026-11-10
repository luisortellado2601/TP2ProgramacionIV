import { jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { PublicacionesService } from './publicaciones.service.js';
import { Publicacion } from './publicacion.schema.js';
import { Usuario } from '../usuarios/usuario.schema.js';
import { AlmacenamientoService } from '../almacenamiento/almacenamiento.service.js';

describe('PublicacionesService', () => {
  let service: PublicacionesService;
  let publicacionModel: {
    create: jest.Mock;
    findById: jest.Mock;
    aggregate: jest.Mock;
    countDocuments: jest.Mock;
  };

  beforeEach(async () => {
    publicacionModel = {
      create: jest.fn(),
      findById: jest.fn(),
      aggregate: jest.fn(),
      countDocuments: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicacionesService,
        {
          provide: getModelToken(Publicacion.name),
          useValue: publicacionModel,
        },
        {
          provide: getModelToken(Usuario.name),
          useValue: {
            findById: jest.fn(),
          },
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
        autor: {
          id: autorId.toString(),
          nombre: 'Ana',
          apellido: 'Pérez',
          nombreUsuario: 'ana',
          imagenPerfilUrl: undefined,
        },
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
});
