import { jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { EstadisticasService } from './estadisticas.service.js';
import { Publicacion } from '../publicaciones/publicacion.schema.js';
import { Comentario } from '../comentarios/comentario.schema.js';
import { Usuario } from '../usuarios/usuario.schema.js';

describe('EstadisticasService', () => {
  const aggregatePublicaciones = jest.fn();
  const aggregateComentarios = jest.fn();
  let service: EstadisticasService;

  const devolver = (mock: jest.Mock, filas: unknown[]) =>
    mock.mockReturnValue({ exec: () => Promise.resolve(filas) });

  // Primera etapa ($match) del pipeline con que se llamó al aggregate.
  const primerMatch = (mock: jest.Mock) =>
    (mock.mock.calls[0][0] as { $match: Record<string, unknown> }[])[0].$match;

  beforeEach(async () => {
    aggregatePublicaciones.mockReset();
    aggregateComentarios.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EstadisticasService,
        {
          provide: getModelToken(Publicacion.name),
          useValue: {
            aggregate: aggregatePublicaciones,
            collection: { name: 'publicacions' },
          },
        },
        {
          provide: getModelToken(Comentario.name),
          useValue: { aggregate: aggregateComentarios },
        },
        {
          provide: getModelToken(Usuario.name),
          useValue: { collection: { name: 'usuarios' } },
        },
      ],
    }).compile();
    service = module.get(EstadisticasService);
  });

  it('publicacionesPorUsuario devuelve el ranking mapeado', async () => {
    const usuarioId = new Types.ObjectId();
    devolver(aggregatePublicaciones, [
      { _id: usuarioId, cantidad: 4, nombreUsuario: 'ana' },
    ]);

    const resultado = await service.publicacionesPorUsuario({}, 10);

    expect(resultado).toEqual([
      { usuarioId: usuarioId.toString(), nombreUsuario: 'ana', cantidad: 4 },
    ]);
  });

  it('solo cuenta publicaciones activas y sin lapso no filtra por fecha', async () => {
    devolver(aggregatePublicaciones, []);

    await service.publicacionesPorUsuario({}, 10);

    expect(primerMatch(aggregatePublicaciones)).toEqual({ eliminada: false });
  });

  it('con "hasta" solo como fecha incluye el día completo', async () => {
    devolver(aggregatePublicaciones, []);

    await service.publicacionesPorUsuario(
      { desde: '2026-11-01', hasta: '2026-11-03' },
      10,
    );

    expect(primerMatch(aggregatePublicaciones).fecha).toEqual({
      $gte: new Date('2026-11-01'),
      $lt: new Date('2026-11-04'),
    });
  });

  it('con "hasta" como fecha ISO completa lo usa tal cual', async () => {
    devolver(aggregatePublicaciones, []);

    await service.publicacionesPorUsuario(
      { hasta: '2026-11-03T12:00:00.000Z' },
      10,
    );

    expect(primerMatch(aggregatePublicaciones).fecha).toEqual({
      $lte: new Date('2026-11-03T12:00:00.000Z'),
    });
  });

  it('acepta desde y hasta iguales (un solo día)', async () => {
    devolver(aggregatePublicaciones, []);

    await expect(
      service.publicacionesPorUsuario(
        { desde: '2026-11-03', hasta: '2026-11-03' },
        10,
      ),
    ).resolves.toEqual([]);
  });

  it('responde 400 si "desde" es posterior a "hasta"', async () => {
    await expect(
      service.comentarios({ desde: '2026-11-10', hasta: '2026-11-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(aggregateComentarios).not.toHaveBeenCalled();
  });

  it('responde 400 si "hasta" es posterior a hoy (fecha sola o ISO completa)', async () => {
    const manana = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await expect(
      service.comentarios({ hasta: manana.toISOString().slice(0, 10) }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.comentarios({ hasta: manana.toISOString() }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(aggregateComentarios).not.toHaveBeenCalled();
  });

  it('acepta "hasta" igual a hoy', async () => {
    devolver(aggregateComentarios, []);
    const hoy = new Date().toISOString().slice(0, 10);

    await expect(service.comentarios({ hasta: hoy })).resolves.toEqual({
      total: 0,
      porDia: [],
    });
  });

  it('comentarios devuelve el total y la cantidad por día', async () => {
    devolver(aggregateComentarios, [
      { _id: '2026-11-01', cantidad: 3 },
      { _id: '2026-11-02', cantidad: 5 },
    ]);

    const resultado = await service.comentarios({});

    expect(resultado).toEqual({
      total: 8,
      porDia: [
        { fecha: '2026-11-01', cantidad: 3 },
        { fecha: '2026-11-02', cantidad: 5 },
      ],
    });
  });

  it('comentarios sin datos devuelve total 0', async () => {
    devolver(aggregateComentarios, []);

    await expect(service.comentarios({})).resolves.toEqual({
      total: 0,
      porDia: [],
    });
  });

  it('comentariosPorPublicacion devuelve el ranking con el título', async () => {
    const publicacionId = new Types.ObjectId();
    devolver(aggregateComentarios, [
      { _id: publicacionId, cantidad: 7, titulo: 'Reseña de Zelda' },
    ]);

    const resultado = await service.comentariosPorPublicacion({}, 10);

    expect(resultado).toEqual([
      {
        publicacionId: publicacionId.toString(),
        titulo: 'Reseña de Zelda',
        cantidad: 7,
      },
    ]);
    expect(primerMatch(aggregateComentarios)).toEqual({ eliminado: false });
  });
});
