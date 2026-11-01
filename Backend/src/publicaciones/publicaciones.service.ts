import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Publicacion, PublicacionDocument } from './publicacion.schema.js';
import {
  PerfilUsuario,
  Usuario,
  UsuarioDocument,
} from '../usuarios/usuario.schema.js';
import { CrearPublicacionDto } from './dto/crear-publicacion.dto.js';
import { ListarPublicacionesDto } from './dto/listar-publicaciones.dto.js';
import { AlmacenamientoService } from '../almacenamiento/almacenamiento.service.js';

@Injectable()
export class PublicacionesService {
  constructor(
    @InjectModel(Publicacion.name)
    private readonly publicacionModel: Model<PublicacionDocument>,
    @InjectModel(Usuario.name)
    private readonly usuarioModel: Model<UsuarioDocument>,
    private readonly almacenamientoService: AlmacenamientoService,
  ) {}

  async crear(dto: CrearPublicacionDto) {
    const autor = await this.obtenerUsuarioOFallar(dto.usuarioId);

    const imagenUrl = dto.imagen
      ? await this.almacenamientoService.subirImagen(
          dto.imagen,
          'publicaciones',
        )
      : undefined;

    const publicacion = await this.publicacionModel.create({
      titulo: dto.titulo,
      mensaje: dto.mensaje,
      imagenUrl,
      usuario: autor._id,
    });

    return {
      id: publicacion._id.toString(),
      titulo: publicacion.titulo,
      mensaje: publicacion.mensaje,
      imagenUrl: publicacion.imagenUrl,
      fecha: publicacion.fecha,
      likes: [],
      cantidadLikes: 0,
      autor: this.aAutor(autor),
    };
  }

  async listar(dto: ListarPublicacionesDto) {
    const filtro: Record<string, unknown> = { eliminada: false };
    if (dto.usuario) {
      filtro.usuario = new Types.ObjectId(dto.usuario);
    }

    const orden: Record<string, 1 | -1> =
      dto.orden === 'likes'
        ? { cantidadLikes: -1, fecha: -1 }
        : { fecha: -1 };

    const resultados = await this.publicacionModel
      .aggregate([
        { $match: filtro },
        { $addFields: { cantidadLikes: { $size: '$likes' } } },
        { $sort: orden },
        { $skip: dto.offset },
        { $limit: dto.limit },
        {
          $lookup: {
            from: 'usuarios',
            localField: 'usuario',
            foreignField: '_id',
            as: 'autor',
          },
        },
        { $unwind: '$autor' },
      ])
      .exec();

    return resultados.map((publicacion) => ({
      id: publicacion._id.toString(),
      titulo: publicacion.titulo,
      mensaje: publicacion.mensaje,
      imagenUrl: publicacion.imagenUrl,
      fecha: publicacion.fecha,
      likes: publicacion.likes.map((id: Types.ObjectId) => id.toString()),
      cantidadLikes: publicacion.cantidadLikes,
      autor: this.aAutor(publicacion.autor),
    }));
  }

  async eliminar(id: string, usuarioId: string) {
    const publicacion = await this.obtenerActivaOFallar(id);
    const solicitante = await this.usuarioModel.findById(usuarioId).exec();

    const esAutor = publicacion.usuario.toString() === usuarioId;
    const esAdministrador =
      solicitante?.perfil === PerfilUsuario.ADMINISTRADOR;
    if (!esAutor && !esAdministrador) {
      throw new ForbiddenException(
        'No podés eliminar una publicación de otro usuario',
      );
    }

    publicacion.eliminada = true;
    await publicacion.save();

    return { id: publicacion._id.toString(), eliminada: true };
  }

  async darLike(id: string, usuarioId: string) {
    await this.obtenerUsuarioOFallar(usuarioId);
    const publicacion = await this.obtenerActivaOFallar(id);
    const yaDioLike = publicacion.likes.some(
      (idUsuario) => idUsuario.toString() === usuarioId,
    );
    if (yaDioLike) {
      throw new ConflictException('Ya le diste me gusta a esta publicación');
    }

    publicacion.likes.push(new Types.ObjectId(usuarioId));
    await publicacion.save();

    return this.aRespuestaLikes(publicacion);
  }

  async quitarLike(id: string, usuarioId: string) {
    await this.obtenerUsuarioOFallar(usuarioId);
    const publicacion = await this.obtenerActivaOFallar(id);
    const indice = publicacion.likes.findIndex(
      (idUsuario) => idUsuario.toString() === usuarioId,
    );
    if (indice === -1) {
      throw new ConflictException('No le diste me gusta a esta publicación');
    }

    publicacion.likes.splice(indice, 1);
    await publicacion.save();

    return this.aRespuestaLikes(publicacion);
  }

  private async obtenerActivaOFallar(
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
    if (!Types.ObjectId.isValid(usuarioId)) {
      throw new BadRequestException('El usuario no existe');
    }

    const usuario = await this.usuarioModel.findById(usuarioId).exec();
    if (!usuario) {
      throw new BadRequestException('El usuario no existe');
    }

    return usuario;
  }

  private aRespuestaLikes(publicacion: PublicacionDocument) {
    return {
      id: publicacion._id.toString(),
      likes: publicacion.likes.map((idUsuario) => idUsuario.toString()),
      cantidadLikes: publicacion.likes.length,
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
}
