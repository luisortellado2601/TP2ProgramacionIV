import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { PerfilController } from './perfil.controller.js';
import { UsuariosService } from './usuarios.service.js';
import type { ActualizarPerfilDto } from './dto/actualizar-perfil.dto.js';

describe('PerfilController', () => {
  let controller: PerfilController;
  const usuariosService = { actualizarPerfil: jest.fn() };

  beforeEach(async () => {
    usuariosService.actualizarPerfil.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PerfilController],
      providers: [{ provide: UsuariosService, useValue: usuariosService }],
    }).compile();
    controller = module.get(PerfilController);
  });

  it('actualiza el perfil del dueño del token con los datos del body', () => {
    const dto = {
      nombre: 'Ana',
      apellido: 'Gómez',
      fechaNacimiento: '1999-05-20',
    } as ActualizarPerfilDto;

    void controller.actualizar('id-del-token', dto);

    expect(usuariosService.actualizarPerfil).toHaveBeenCalledWith(
      'id-del-token',
      dto,
    );
  });

  it('no es una ruta solo de administradores (sin @Roles): cualquier usuario con sesión puede usarla', () => {
    const roles = Reflect.getMetadata('roles', PerfilController) as unknown;
    const metodo = Object.getOwnPropertyDescriptor(
      PerfilController.prototype,
      'actualizar',
    )?.value as object;
    const rolesMetodo = Reflect.getMetadata('roles', metodo) as unknown;

    expect(roles).toBeUndefined();
    expect(rolesMetodo).toBeUndefined();
  });
});
