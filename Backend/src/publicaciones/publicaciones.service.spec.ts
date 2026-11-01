import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PublicacionesService } from './publicaciones.service.js';
import { Publicacion } from './publicacion.schema.js';
import { Usuario } from '../usuarios/usuario.schema.js';
import { AlmacenamientoService } from '../almacenamiento/almacenamiento.service.js';

describe('PublicacionesService', () => {
  let service: PublicacionesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicacionesService,
        {
          provide: getModelToken(Publicacion.name),
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            aggregate: jest.fn(),
          },
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
});
