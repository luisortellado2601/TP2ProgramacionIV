import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsuariosController } from './usuarios.controller.js';
import { UsuariosService } from './usuarios.service.js';
import { Usuario } from './usuario.schema.js';

describe('UsuariosController', () => {
  let controller: UsuariosController;
  const usuariosService = {
    listar: jest.fn(),
    crear: jest.fn(),
    deshabilitar: jest.fn(),
    habilitar: jest.fn(),
  };

  beforeEach(async () => {
    Object.values(usuariosService).forEach((mock) => mock.mockReset());

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsuariosController],
      providers: [
        { provide: UsuariosService, useValue: usuariosService },
        // Lo necesita RolesGuard, que @Roles() instancia en este módulo.
        { provide: getModelToken(Usuario.name), useValue: {} },
      ],
    }).compile();

    controller = module.get(UsuariosController);
  });

  it('deshabilitar pasa el id y el administrador que lo pide', () => {
    void controller.deshabilitar('id-objetivo', 'id-admin');

    expect(usuariosService.deshabilitar).toHaveBeenCalledWith(
      'id-objetivo',
      'id-admin',
    );
  });

  it('habilitar delega en el service', () => {
    void controller.habilitar('id-objetivo');

    expect(usuariosService.habilitar).toHaveBeenCalledWith('id-objetivo');
  });
});
