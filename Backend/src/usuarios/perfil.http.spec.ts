import { jest } from '@jest/globals';
import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types';
import { PerfilController } from './perfil.controller.js';
import { UsuariosController } from './usuarios.controller.js';
import { UsuariosService } from './usuarios.service.js';
import { Usuario } from './usuario.schema.js';
import { AuthService } from '../auth/auth.service.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { AlmacenamientoService } from '../almacenamiento/almacenamiento.service.js';
import type { RequestAutenticada } from '../auth/payload-token.js';

// Reproduce lo que hace la app real: ValidationPipe global y guards globales (primero el de JWT,
// acá reemplazado por uno que deja pasar con un usuario fijo, y después RolesGuard de verdad).
describe('PUT /usuarios/me (HTTP)', () => {
  const id = new Types.ObjectId();
  const usuario = {
    _id: id,
    nombre: 'Ana',
    apellido: 'Gómez',
    correo: 'ana@mail.com',
    nombreUsuario: 'ana',
    contrasena: 'hash-secreto',
    fechaNacimiento: new Date('1999-05-20'),
    perfil: 'usuario', // un usuario COMÚN, no administrador
    habilitado: true,
  };
  const exec = (valor: unknown) => ({ exec: () => Promise.resolve(valor) });

  const findOne = jest.fn();
  const findById = jest.fn();
  const findByIdAndUpdate = jest.fn();
  const subirImagen = jest.fn<() => Promise<string>>();
  let app: INestApplication<App>;

  class AutenticacionFalsa implements CanActivate {
    canActivate(contexto: ExecutionContext): boolean {
      const req = contexto.switchToHttp().getRequest<RequestAutenticada>();
      req.usuario = { sub: id.toString() } as RequestAutenticada['usuario'];
      return true;
    }
  }

  beforeEach(async () => {
    findOne.mockReset().mockReturnValue(exec(usuario));
    findById.mockReset().mockReturnValue(exec(usuario));
    findByIdAndUpdate.mockReset();
    subirImagen.mockReset();

    const modulo = await Test.createTestingModule({
      controllers: [UsuariosController, PerfilController],
      providers: [
        UsuariosService,
        { provide: APP_GUARD, useClass: AutenticacionFalsa },
        { provide: APP_GUARD, useClass: RolesGuard },
        {
          provide: getModelToken(Usuario.name),
          useValue: { findOne, findById, findByIdAndUpdate, find: jest.fn() },
        },
        { provide: AuthService, useValue: {} },
        { provide: AlmacenamientoService, useValue: { subirImagen } },
      ],
    }).compile();

    app = modulo.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const cuerpo = {
    nombre: 'Ana María',
    apellido: 'Gómez',
    fechaNacimiento: '1999-05-20',
  };

  it('un usuario común puede editar su perfil: responde 200 con sus datos y sin la contraseña', async () => {
    findByIdAndUpdate.mockReturnValue(
      exec({ ...usuario, nombre: 'Ana María' }),
    );

    const respuesta = await request(app.getHttpServer())
      .put('/usuarios/me')
      .send(cuerpo)
      .expect(200);

    expect(respuesta.body).toMatchObject({
      id: id.toString(),
      nombre: 'Ana María',
    });
    expect(respuesta.body).not.toHaveProperty('contrasena');
    // El id que se actualiza es el del token, no uno que mande el cliente.
    expect(findByIdAndUpdate.mock.calls[0][0]).toBe(id.toString());
  });

  it('con imagen nueva responde 200 y guarda la URL que devolvió el almacenamiento', async () => {
    subirImagen.mockResolvedValue('https://storage/perfiles/nueva.png');
    findByIdAndUpdate.mockReturnValue(
      exec({
        ...usuario,
        imagenPerfilUrl: 'https://storage/perfiles/nueva.png',
      }),
    );

    const respuesta = await request(app.getHttpServer())
      .put('/usuarios/me')
      .send({ ...cuerpo, imagenPerfil: 'data:image/png;base64,AAAA' })
      .expect(200);

    expect(respuesta.body.imagenPerfilUrl).toBe(
      'https://storage/perfiles/nueva.png',
    );
  });

  it.each(['perfil', 'correo', 'nombreUsuario', 'contrasena', 'habilitado'])(
    'intentar cambiar "%s" responde 400 y no actualiza nada',
    async (campo) => {
      await request(app.getHttpServer())
        .put('/usuarios/me')
        .send({ ...cuerpo, [campo]: 'administrador' })
        .expect(400);

      expect(findByIdAndUpdate).not.toHaveBeenCalled();
    },
  );

  it('datos inválidos responden 400', async () => {
    await request(app.getHttpServer())
      .put('/usuarios/me')
      .send({ ...cuerpo, fechaNacimiento: '2999-01-01' })
      .expect(400);
    await request(app.getHttpServer()).put('/usuarios/me').send({}).expect(400);
  });

  it('si la sesión ya no es válida (usuario deshabilitado o borrado) responde 401', async () => {
    findOne.mockReturnValue(exec(null));

    await request(app.getHttpServer())
      .put('/usuarios/me')
      .send(cuerpo)
      .expect(401);
    expect(findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('sigue prohibido para un usuario común lo que es de administradores (403)', async () => {
    await request(app.getHttpServer()).get('/usuarios').expect(403);
  });
});
