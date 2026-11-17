import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Usuario, UsuarioDocument } from './usuario.schema.js';
import { aRespuestaUsuario } from './usuario-respuesta.js';
import { AuthService } from '../auth/auth.service.js';
import { RegistroDto } from '../auth/dto/registro.dto.js';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto.js';
import { AlmacenamientoService } from '../almacenamiento/almacenamiento.service.js';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectModel(Usuario.name)
    private readonly usuarioModel: Model<UsuarioDocument>,
    private readonly authService: AuthService,
    private readonly almacenamientoService: AlmacenamientoService,
  ) {}

  async listar() {
    const usuarios = await this.usuarioModel
      .find()
      .sort({ fechaAlta: -1 })
      .exec();
    return usuarios.map(aRespuestaUsuario);
  }

  async crear(dto: RegistroDto) {
    const usuario = await this.authService.crearUsuario(dto);
    return aRespuestaUsuario(usuario);
  }

  async actualizarPerfil(usuarioId: string, dto: ActualizarPerfilDto) {
    const vigente = Types.ObjectId.isValid(usuarioId)
      ? await this.usuarioModel
          .findOne({ _id: usuarioId, habilitado: true })
          .exec()
      : null;
    if (!vigente) {
      throw new UnauthorizedException('La sesión ya no es válida');
    }

    const cambios: Partial<Usuario> = {
      nombre: dto.nombre,
      apellido: dto.apellido,
      fechaNacimiento: new Date(dto.fechaNacimiento),
    };
    if (dto.descripcion !== undefined) {
      cambios.descripcion = dto.descripcion;
    }
    if (dto.imagenPerfil) {
      cambios.imagenPerfilUrl = await this.almacenamientoService.subirImagen(
        dto.imagenPerfil,
        'perfiles',
      );
    }

    const actualizado = await this.usuarioModel
      .findByIdAndUpdate(
        usuarioId,
        { $set: cambios },
        { returnDocument: 'after' },
      )
      .exec();
    if (!actualizado) {
      throw new UnauthorizedException('La sesión ya no es válida');
    }
    return aRespuestaUsuario(actualizado);
  }

  async deshabilitar(id: string, solicitanteId: string) {
    if (id === solicitanteId) {
      throw new BadRequestException('No podés deshabilitar tu propio usuario');
    }
    return this.cambiarHabilitado(id, false);
  }

  async habilitar(id: string) {
    return this.cambiarHabilitado(id, true);
  }

  private async cambiarHabilitado(id: string, habilitado: boolean) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('El id del usuario no es válido');
    }
    const usuario = await this.usuarioModel
      .findByIdAndUpdate(id, { habilitado }, { returnDocument: 'after' })
      .exec();
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return aRespuestaUsuario(usuario);
  }
}
