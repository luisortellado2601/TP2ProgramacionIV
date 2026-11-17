import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Busqueda, BusquedaDocument } from './busqueda.schema.js';
import {
  PerfilUsuario,
  Usuario,
  UsuarioDocument,
} from '../usuarios/usuario.schema.js';
import { CrearBusquedaDto } from './dto/crear-busqueda.dto.js';
import { CrearRespuestaDto } from './dto/crear-respuesta.dto.js';
import { ListarBusquedasDto } from './dto/listar-busquedas.dto.js';
import { MAXIMO_RESPUESTAS } from './opciones.js';

interface RespuestaPoblada {
  _id: Types.ObjectId;
  mensaje: string;
  fecha: Date;
  usuario: UsuarioDocument;
}

@Injectable()
export class BusquedasService {
  constructor(
    @InjectModel(Busqueda.name)
    private readonly busquedaModel: Model<BusquedaDocument>,
    @InjectModel(Usuario.name)
    private readonly usuarioModel: Model<UsuarioDocument>,
  ) {}

  async crear(usuarioId: string, dto: CrearBusquedaDto) {
    const autor = await this.obtenerUsuarioOFallar(usuarioId);

    const busqueda = await this.busquedaModel.create({
      juego: dto.juego,
      region: dto.region,
      plataforma: dto.plataforma,
      descripcion: dto.descripcion,
      usuario: autor._id,
    });

    return this.aRespuesta(busqueda, autor, []);
  }

  async listar(dto: ListarBusquedasDto) {
    const filtro: Record<string, unknown> = { activa: true };
    if (dto.juego) {
      filtro.juego = new RegExp(`^${this.escaparRegex(dto.juego)}$`, 'i');
    }
    if (dto.region) {
      filtro.region = dto.region;
    }
    if (dto.plataforma) {
      filtro.plataforma = dto.plataforma;
    }

    const [total, resultados] = await Promise.all([
      this.busquedaModel.countDocuments(filtro).exec(),
      this.busquedaModel
        .find(filtro)
        .sort({ fecha: -1 })
        .skip(dto.offset)
        .limit(dto.limit)
        .populate('usuario')
        .populate('respuestas.usuario')
        .exec(),
    ]);

    return {
      total,
      busquedas: resultados.map((b) =>
        this.aRespuesta(
          b,
          b.usuario as unknown as UsuarioDocument,
          b.respuestas as unknown as RespuestaPoblada[],
        ),
      ),
    };
  }

  async responder(id: string, usuarioId: string, dto: CrearRespuestaDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('El id de la búsqueda no es válido');
    }
    const autor = await this.obtenerUsuarioOFallar(usuarioId);

    const busqueda = await this.busquedaModel
      .findOneAndUpdate(
        {
          _id: id,
          activa: true,
          usuario: { $ne: autor._id },
          [`respuestas.${MAXIMO_RESPUESTAS - 1}`]: { $exists: false },
        },
        {
          $push: {
            respuestas: {
              usuario: autor._id,
              mensaje: dto.mensaje,
              fecha: new Date(),
            },
          },
        },
        { returnDocument: 'after' },
      )
      .exec();
    if (!busqueda) {
      const existente = await this.busquedaModel.findById(id).exec();
      if (!existente || !existente.activa) {
        throw new NotFoundException('Búsqueda no encontrada');
      }
      if (existente.usuario.toString() === usuarioId) {
        throw new ForbiddenException(
          'No podés contactarte con tu propia búsqueda',
        );
      }
      throw new ConflictException(
        'Esta búsqueda ya alcanzó el máximo de mensajes',
      );
    }

    const nueva = busqueda.respuestas[
      busqueda.respuestas.length - 1
    ] as unknown as { _id: Types.ObjectId; mensaje: string; fecha: Date };
    return this.aRespuestaMensaje({
      _id: nueva._id,
      mensaje: nueva.mensaje,
      fecha: nueva.fecha,
      usuario: autor,
    });
  }

  async cerrar(id: string, usuarioId: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('El id de la búsqueda no es válido');
    }
    const busqueda = await this.busquedaModel.findById(id).exec();
    if (!busqueda || !busqueda.activa) {
      throw new NotFoundException('Búsqueda no encontrada');
    }
    const solicitante = await this.obtenerUsuarioOFallar(usuarioId);

    const esAutor = busqueda.usuario.toString() === usuarioId;
    const esAdministrador = solicitante.perfil === PerfilUsuario.ADMINISTRADOR;
    if (!esAutor && !esAdministrador) {
      throw new ForbiddenException(
        'No podés cerrar la búsqueda de otro usuario',
      );
    }

    await this.busquedaModel
      .updateOne({ _id: busqueda._id }, { activa: false })
      .exec();

    return { id: busqueda._id.toString(), cerrada: true };
  }

  private async obtenerUsuarioOFallar(
    usuarioId: string,
  ): Promise<UsuarioDocument> {
    if (!Types.ObjectId.isValid(usuarioId)) {
      throw new BadRequestException('El usuario no existe');
    }
    const usuario = await this.usuarioModel.findById(usuarioId).exec();
    if (!usuario) {
      throw new BadRequestException('El usuario no existe');
    }
    return usuario;
  }

  private escaparRegex(texto: string): string {
    return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private aRespuestaMensaje(respuesta: RespuestaPoblada) {
    return {
      id: respuesta._id.toString(),
      mensaje: respuesta.mensaje,
      fecha: respuesta.fecha,
      autor: this.aAutor(respuesta.usuario),
    };
  }

  private aAutor(autor: UsuarioDocument) {
    return {
      id: autor._id.toString(),
      nombre: autor.nombre,
      apellido: autor.apellido,
      nombreUsuario: autor.nombreUsuario,
      imagenPerfilUrl: autor.imagenPerfilUrl,
    };
  }

  private aRespuesta(
    busqueda: BusquedaDocument,
    autor: UsuarioDocument,
    respuestas: RespuestaPoblada[],
  ) {
    return {
      id: busqueda._id.toString(),
      juego: busqueda.juego,
      region: busqueda.region,
      plataforma: busqueda.plataforma,
      descripcion: busqueda.descripcion,
      fecha: busqueda.fecha,
      autor: this.aAutor(autor),
      respuestas: respuestas.map((r) => this.aRespuestaMensaje(r)),
    };
  }
}
