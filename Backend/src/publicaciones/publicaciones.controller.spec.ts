import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { PublicacionesController } from './publicaciones.controller.js';
import { PublicacionesService } from './publicaciones.service.js';

describe('PublicacionesController', () => {
  let controller: PublicacionesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicacionesController],
      providers: [
        {
          provide: PublicacionesService,
          useValue: {
            crear: jest.fn(),
            listar: jest.fn(),
            eliminar: jest.fn(),
            darLike: jest.fn(),
            quitarLike: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PublicacionesController>(
      PublicacionesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
