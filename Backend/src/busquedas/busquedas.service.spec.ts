import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { BusquedasService } from './busquedas.service.js';
import { Busqueda } from './busqueda.schema.js';
import { PerfilUsuario, Usuario } from '../usuarios/usuario.schema.js';

describe('BusquedasService', () => {
  let service: BusquedasService;
  let busquedaModel: {
    create: jest.Mock;
    find: jest.Mock;
    findById: jest.Mock;
    findOneAndUpdate: jest.Mock;
    updateOne: jest.Mock;
    countDocuments: jest.Mock;
  };
  let usuarioModel: { findById: jest.Mock };

  const autorId = new Types.ObjectId();
  const autor = {
    _id: autorId,
    nombre: 'Ana',
    apellido: 'Gómez',
    nombreUsuario: 'ana',
    imagenPerfilUrl: undefined,
    perfil: PerfilUsuario.USUARIO,
  };

  const dtoValido = {
    juego: 'Valorant',
    region: 'Sudamérica',
    plataforma: 'PC',
    descripcion: 'Buscamos dos para ranked',
  };

  const devolverUsuario = (usuario: unknown) =>
    usuarioModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(usuario),
    });

  beforeEach(async () => {
    busquedaModel = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findOneAndUpdate: jest.fn(),
      updateOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({}),
      }),
      countDocuments: jest.fn(),
    };
    usuarioModel = { findById: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusquedasService,
        { provide: getModelToken(Busqueda.name), useValue: busquedaModel },
        { provide: getModelToken(Usuario.name), useValue: usuarioModel },
      ],
    }).compile();

    service = module.get(BusquedasService);
  });

  describe('crear', () => {
    it('guarda la búsqueda con el autor del token y devuelve sus datos', async () => {
      devolverUsuario(autor);
      const id = new Types.ObjectId();
      busquedaModel.create.mockResolvedValue({
        _id: id,
        ...dtoValido,
        fecha: new Date(),
      });

      const resultado = await service.crear(autorId.toString(), dtoValido);

      expect(busquedaModel.create).toHaveBeenCalledWith({
        ...dtoValido,
        usuario: autorId,
      });
      expect(resultado).toMatchObject({
        id: id.toString(),
        juego: 'Valorant',
        region: 'Sudamérica',
        plataforma: 'PC',
        respuestas: [],
        autor: { id: autorId.toString(), nombreUsuario: 'ana' },
      });
    });

    it('rechaza si el usuario del token no existe', async () => {
      devolverUsuario(null);

      await expect(
        service.crear(autorId.toString(), dtoValido),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(busquedaModel.create).not.toHaveBeenCalled();
    });
  });

  describe('listar', () => {
    const preparar = (resultados: unknown[], total = resultados.length) => {
      busquedaModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(total),
      });
      const cadena = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(resultados),
      };
      busquedaModel.find.mockReturnValue(cadena);
      return cadena;
    };

    it('sin filtros trae solo las búsquedas activas, las más nuevas primero', async () => {
      const cadena = preparar([]);

      const resultado = await service.listar({ offset: 0, limit: 10 });

      expect(busquedaModel.find).toHaveBeenCalledWith({ activa: true });
      expect(cadena.sort).toHaveBeenCalledWith({ fecha: -1 });
      expect(resultado).toEqual({ total: 0, busquedas: [] });
    });

    it('aplica cada filtro: juego (sin distinguir mayúsculas), región y plataforma', async () => {
      preparar([]);

      await service.listar({
        juego: 'valorant',
        region: 'Europa',
        plataforma: 'Xbox',
        offset: 0,
        limit: 10,
      });

      const filtro = busquedaModel.find.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(filtro).toMatchObject({
        activa: true,
        region: 'Europa',
        plataforma: 'Xbox',
      });
      expect((filtro.juego as RegExp).test('Valorant')).toBe(true);
      expect((filtro.juego as RegExp).test('Valorant 2')).toBe(false);
    });

    it('escapa los caracteres especiales del juego para que no se interpreten como regex', async () => {
      preparar([]);

      await service.listar({ juego: 'a.*', offset: 0, limit: 10 });

      const filtro = busquedaModel.find.mock.calls[0][0] as { juego: RegExp };
      expect(filtro.juego.test('abc')).toBe(false);
      expect(filtro.juego.test('a.*')).toBe(true);
    });

    it('pagina con offset y límite y devuelve el total', async () => {
      const cadena = preparar([], 25);

      const resultado = await service.listar({ offset: 10, limit: 5 });

      expect(cadena.skip).toHaveBeenCalledWith(10);
      expect(cadena.limit).toHaveBeenCalledWith(5);
      expect(resultado.total).toBe(25);
    });

    it('devuelve cada búsqueda con su autor y los mensajes de contacto', async () => {
      const id = new Types.ObjectId();
      const otro = {
        ...autor,
        _id: new Types.ObjectId(),
        nombreUsuario: 'beto',
      };
      preparar([
        {
          _id: id,
          ...dtoValido,
          fecha: new Date(),
          usuario: autor,
          respuestas: [
            {
              _id: new Types.ObjectId(),
              mensaje: 'Me sumo',
              fecha: new Date(),
              usuario: otro,
            },
          ],
        },
      ]);

      const { busquedas } = await service.listar({ offset: 0, limit: 10 });

      expect(busquedas[0]).toMatchObject({
        id: id.toString(),
        juego: 'Valorant',
        autor: { nombreUsuario: 'ana' },
        respuestas: [{ mensaje: 'Me sumo', autor: { nombreUsuario: 'beto' } }],
      });
    });
  });

  describe('responder', () => {
    const idBusqueda = new Types.ObjectId();
    const respuestaId = new Types.ObjectId();
    const resultadoDelUpdate = (resultado: unknown) =>
      busquedaModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(resultado),
      });

    class SubdocumentoSimulado {
      constructor(
        private readonly datos: {
          _id: Types.ObjectId;
          mensaje: string;
          fecha: Date;
        },
      ) {}
      get _id() {
        return this.datos._id;
      }
      get mensaje() {
        return this.datos.mensaje;
      }
      get fecha() {
        return this.datos.fecha;
      }
    }

    it('agrega el mensaje con el usuario del token y lo devuelve con su autor', async () => {
      devolverUsuario(autor);
      resultadoDelUpdate({
        respuestas: [
          new SubdocumentoSimulado({
            _id: respuestaId,
            mensaje: 'Me sumo',
            fecha: new Date(),
          }),
        ],
      });

      const resultado = await service.responder(
        idBusqueda.toString(),
        autorId.toString(),
        { mensaje: 'Me sumo' },
      );

      const [filtro, cambio] = busquedaModel.findOneAndUpdate.mock.calls[0] as [
        Record<string, unknown>,
        { $push: { respuestas: object } },
      ];
      expect(filtro).toMatchObject({
        activa: true,
        usuario: { $ne: autorId },
      });
      expect(cambio.$push.respuestas).toMatchObject({
        usuario: autorId,
        mensaje: 'Me sumo',
      });
      expect(resultado).toMatchObject({
        id: respuestaId.toString(),
        mensaje: 'Me sumo',
        autor: { id: autorId.toString(), nombreUsuario: 'ana' },
      });
    });

    it('responde 404 si la búsqueda no existe o está cerrada', async () => {
      devolverUsuario(autor);
      resultadoDelUpdate(null);
      busquedaModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ activa: false }),
      });

      await expect(
        service.responder(idBusqueda.toString(), autorId.toString(), {
          mensaje: 'Hola',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('no deja que el autor se contacte con su propia búsqueda', async () => {
      devolverUsuario(autor);
      resultadoDelUpdate(null);
      busquedaModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ activa: true, usuario: autorId }),
      });

      await expect(
        service.responder(idBusqueda.toString(), autorId.toString(), {
          mensaje: 'Hola',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('responde 409 si la búsqueda ya llegó al máximo de mensajes', async () => {
      devolverUsuario(autor);
      resultadoDelUpdate(null);
      busquedaModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          activa: true,
          usuario: new Types.ObjectId(),
        }),
      });

      await expect(
        service.responder(idBusqueda.toString(), autorId.toString(), {
          mensaje: 'Hola',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('responde 400 si el id no es válido o el usuario no existe', async () => {
      await expect(
        service.responder('no-es-un-id', autorId.toString(), {
          mensaje: 'Hola',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      devolverUsuario(null);
      await expect(
        service.responder(idBusqueda.toString(), autorId.toString(), {
          mensaje: 'Hola',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('cerrar', () => {
    const busquedaDe = (usuario: Types.ObjectId, activa = true) => ({
      _id: new Types.ObjectId(),
      usuario,
      activa,
      save: jest.fn().mockResolvedValue(undefined),
    });
    const devolverBusqueda = (busqueda: unknown) =>
      busquedaModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(busqueda),
      });

    it('el autor puede cerrar su búsqueda', async () => {
      const busqueda = busquedaDe(autorId);
      devolverBusqueda(busqueda);
      devolverUsuario(autor);

      const resultado = await service.cerrar(
        busqueda._id.toString(),
        autorId.toString(),
      );

      expect(busquedaModel.updateOne).toHaveBeenCalledWith(
        { _id: busqueda._id },
        { activa: false },
      );
      expect(resultado).toEqual({ id: busqueda._id.toString(), cerrada: true });
    });

    it('un administrador puede cerrar la de otro usuario', async () => {
      const busqueda = busquedaDe(new Types.ObjectId());
      devolverBusqueda(busqueda);
      devolverUsuario({ ...autor, perfil: PerfilUsuario.ADMINISTRADOR });

      await service.cerrar(busqueda._id.toString(), autorId.toString());

      expect(busquedaModel.updateOne).toHaveBeenCalledWith(
        { _id: busqueda._id },
        { activa: false },
      );
    });

    it('otro usuario no puede cerrarla', async () => {
      const busqueda = busquedaDe(new Types.ObjectId());
      devolverBusqueda(busqueda);
      devolverUsuario(autor);

      await expect(
        service.cerrar(busqueda._id.toString(), autorId.toString()),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(busquedaModel.updateOne).not.toHaveBeenCalled();
    });

    it('responde 404 si no existe o ya estaba cerrada', async () => {
      devolverBusqueda(null);
      await expect(
        service.cerrar(new Types.ObjectId().toString(), autorId.toString()),
      ).rejects.toBeInstanceOf(NotFoundException);

      devolverBusqueda(busquedaDe(autorId, false));
      await expect(
        service.cerrar(new Types.ObjectId().toString(), autorId.toString()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('responde 400 si el id no es válido', async () => {
      await expect(
        service.cerrar('no-es-un-id', autorId.toString()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
