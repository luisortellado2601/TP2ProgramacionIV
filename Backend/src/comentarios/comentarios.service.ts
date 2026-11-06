import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Comentario, ComentarioDocument } from './comentario.schema.js';
import {
  Publicacion,
  PublicacionDocument,
} from '../publicaciones/publicacion.schema.js';
import { Usuario, UsuarioDocument } from '../usuarios/usuario.schema.js';
import { CrearComentarioDto } from './dto/crear-comentario.dto.js';
import { ActualizarComentarioDto } from './dto/actualizar-comentario.dto.js';
import { ListarComentariosDto } from './dto/listar-comentarios.dto.js';

@Injectable()
export class ComentariosService {
  constructor(
    @InjectModel(Comentario.name)
    private readonly comentarioModel: Model<ComentarioDocument>,
    @InjectModel(Publicacion.name)
    private readonly publicacionModel: Model<PublicacionDocument>,
    @InjectModel(Usuario.name)
    private readonly usuarioModel: Model<UsuarioDocument>,
  ) {}

  async crear(
    publicacionId: string,
    usuarioId: string,
    dto: CrearComentarioDto,
  ) {
    const publicacion = await this.obtenerPublicacionActivaOFallar(
      publicacionId,
    );
    const autor = await this.obtenerUsuarioOFallar(usuarioId);

    const comentario = await this.comentarioModel.create({
      publicacion: publicacion._id,
      usuario: autor._id,
      mensaje: dto.mensaje,
    });

    return this.aRespuesta(comentario, autor);
  }

  async listar(publicacionId: string, dto: ListarComentariosDto) {
    const publicacion = await this.obtenerPublicacionActivaOFallar(
      publicacionId,
    );
    const filtro = { publicacion: publicacion._id, eliminado: false };

    const [total, comentarios] = await Promise.all([
      this.comentarioModel.countDocuments(filtro).exec(),
      this.comentarioModel
        .find(filtro)
        .sort({ fecha: -1, _id: -1 })
        .skip(dto.offset)
        .limit(dto.limit)
        .populate<{ usuario: UsuarioDocument }>('usuario')
        .exec(),
    ]);

    return {
      total,
      comentarios: comentarios.map((comentario) =>
        this.aRespuesta(comentario, comentario.usuario),
      ),
    };
  }

  async actualizar(
    id: string,
    usuarioId: string,
    dto: ActualizarComentarioDto,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('El id del comentario no es válido');
    }

    const comentario = await this.comentarioModel.findById(id).exec();
    if (!comentario || comentario.eliminado) {
      throw new NotFoundException('Comentario no encontrado');
    }
    // Si la publicación fue dada de baja, sus comentarios dejan de estar disponibles.
    await this.obtenerPublicacionActivaOFallar(comentario.publicacion.toString());

    if (comentario.usuario.toString() !== usuarioId) {
      throw new ForbiddenException(
        'No podés editar un comentario de otro usuario',
      );
    }

    comentario.mensaje = dto.mensaje;
    comentario.modificado = true;
    await comentario.save();

    const autor = await this.obtenerUsuarioOFallar(usuarioId);
    return this.aRespuesta(comentario, autor);
  }

  private async obtenerPublicacionActivaOFallar(
    id: string,
  ): Promise<PublicacionDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('El id de la publicación no es válido');
    }

    const publicacion = await this.publicacionModel.findById(id).exec();
    if (!publicacion || publicacion.eliminada) {
      throw new NotFoundException('Publicación no encontrada');
    }

    return publicacion;
  }

  private async obtenerUsuarioOFallar(
    usuarioId: string,
  ): Promise<UsuarioDocument> {
    const usuario = await this.usuarioModel.findById(usuarioId).exec();
    if (!usuario) {
      throw new BadRequestException('El usuario no existe');
    }

    return usuario;
  }

  private aRespuesta(
    comentario: Pick<
      ComentarioDocument,
      '_id' | 'publicacion' | 'mensaje' | 'fecha' | 'modificado'
    >,
    autor: UsuarioDocument,
  ) {
    return {
      id: comentario._id.toString(),
      publicacionId: comentario.publicacion.toString(),
      mensaje: comentario.mensaje,
      fecha: comentario.fecha,
      modificado: comentario.modificado,
      autor: {
        id: autor._id.toString(),
        nombre: autor.nombre,
        apellido: autor.apellido,
        nombreUsuario: autor.nombreUsuario,
        imagenPerfilUrl: autor.imagenPerfilUrl,
      },
    };
  }
}
