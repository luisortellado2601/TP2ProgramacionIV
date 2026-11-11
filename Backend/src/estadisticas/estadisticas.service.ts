import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { Publicacion, PublicacionDocument } from '../publicaciones/publicacion.schema.js';
import { Comentario, ComentarioDocument } from '../comentarios/comentario.schema.js';
import { Usuario, UsuarioDocument } from '../usuarios/usuario.schema.js';
import { RangoFechasDto } from './dto/rango-fechas.dto.js';

const SOLO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const UN_DIA_MS = 24 * 60 * 60 * 1000;

// Todas las estadísticas excluyen publicaciones dadas de baja y los comentarios
// eliminados o de publicaciones dadas de baja. Los días se cuentan en UTC.
@Injectable()
export class EstadisticasService {
  constructor(
    @InjectModel(Publicacion.name)
    private readonly publicacionModel: Model<PublicacionDocument>,
    @InjectModel(Comentario.name)
    private readonly comentarioModel: Model<ComentarioDocument>,
    @InjectModel(Usuario.name)
    private readonly usuarioModel: Model<UsuarioDocument>,
  ) {}

  // Publicaciones por usuario en el lapso, de más a menos (gráfico de barras).
  async publicacionesPorUsuario(rango: RangoFechasDto, limit: number) {
    const resultado = await this.publicacionModel
      .aggregate<{ _id: Types.ObjectId; cantidad: number; nombreUsuario: string }>([
        { $match: { eliminada: false, ...this.filtroFecha(rango) } },
        { $group: { _id: '$usuario', cantidad: { $sum: 1 } } },
        {
          $lookup: {
            from: this.usuarioModel.collection.name,
            localField: '_id',
            foreignField: '_id',
            as: 'autor',
          },
        },
        { $unwind: '$autor' },
        { $addFields: { nombreUsuario: '$autor.nombreUsuario' } },
        { $sort: { cantidad: -1, nombreUsuario: 1 } },
        { $limit: limit },
      ])
      .exec();

    return resultado.map((r) => ({
      usuarioId: r._id.toString(),
      nombreUsuario: r.nombreUsuario,
      cantidad: r.cantidad,
    }));
  }

  // Comentarios realizados en el lapso: total y cantidad por día (gráfico de líneas).
  async comentarios(rango: RangoFechasDto) {
    const porDia = await this.comentarioModel
      .aggregate<{ _id: string; cantidad: number }>([
        { $match: { eliminado: false, ...this.filtroFecha(rango) } },
        ...this.soloDePublicacionesActivas('publicacion', false),
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$fecha' } },
            cantidad: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .exec();

    const dias = porDia.map((d) => ({ fecha: d._id, cantidad: d.cantidad }));
    return {
      total: dias.reduce((suma, d) => suma + d.cantidad, 0),
      porDia: dias,
    };
  }

  // Comentarios por publicación en el lapso, de más a menos (gráfico de torta).
  async comentariosPorPublicacion(rango: RangoFechasDto, limit: number) {
    const resultado = await this.comentarioModel
      .aggregate<{ _id: Types.ObjectId; cantidad: number; titulo: string }>([
        { $match: { eliminado: false, ...this.filtroFecha(rango) } },
        { $group: { _id: '$publicacion', cantidad: { $sum: 1 } } },
        ...this.soloDePublicacionesActivas('_id', true),
        { $sort: { cantidad: -1, titulo: 1 } },
        { $limit: limit },
      ])
      .exec();

    return resultado.map((r) => ({
      publicacionId: r._id.toString(),
      titulo: r.titulo,
      cantidad: r.cantidad,
    }));
  }

  // Trae la publicación de cada fila y descarta las dadas de baja. Con
  // `conTitulo` deja el título en la fila (para los rankings).
  private soloDePublicacionesActivas(
    campo: string,
    conTitulo: boolean,
  ): PipelineStage[] {
    const etapas: PipelineStage[] = [
      {
        $lookup: {
          from: this.publicacionModel.collection.name,
          localField: campo,
          foreignField: '_id',
          as: 'pub',
        },
      },
      { $unwind: '$pub' },
      { $match: { 'pub.eliminada': false } },
    ];
    if (conTitulo) {
      etapas.push({ $addFields: { titulo: '$pub.titulo' } });
    }
    return etapas;
  }

  // Filtro `{ fecha: { $gte, $lt|$lte } }` según el lapso pedido. Si `hasta`
  // viene solo como fecha, el día completo queda incluido.
  private filtroFecha({ desde, hasta }: RangoFechasDto) {
    const inicio = desde ? new Date(desde) : undefined;
    const hastaPedido = hasta ? new Date(hasta) : undefined;

    if (inicio && hastaPedido && inicio > hastaPedido) {
      throw new BadRequestException(
        'La fecha "desde" no puede ser posterior a "hasta"',
      );
    }

    const finInclusivo = !!hasta && !SOLO_FECHA.test(hasta);
    const fin =
      hastaPedido && !finInclusivo
        ? new Date(hastaPedido.getTime() + UN_DIA_MS)
        : hastaPedido;

    const condicion: Record<string, Date> = {};
    if (inicio) condicion.$gte = inicio;
    if (fin) condicion[finInclusivo ? '$lte' : '$lt'] = fin;
    return Object.keys(condicion).length ? { fecha: condicion } : {};
  }
}
