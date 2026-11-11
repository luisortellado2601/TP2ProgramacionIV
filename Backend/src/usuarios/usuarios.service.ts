import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Usuario, UsuarioDocument } from './usuario.schema.js';
import { aRespuestaUsuario } from './usuario-respuesta.js';
import { AuthService } from '../auth/auth.service.js';
import { RegistroDto } from '../auth/dto/registro.dto.js';

// Gestión de usuarios para administradores. Ninguna respuesta incluye el hash
// de la contraseña (ver aRespuestaUsuario).
@Injectable()
export class UsuariosService {
  constructor(
    @InjectModel(Usuario.name)
    private readonly usuarioModel: Model<UsuarioDocument>,
    private readonly authService: AuthService,
  ) {}

  async listar() {
    const usuarios = await this.usuarioModel
      .find()
      .sort({ fechaAlta: -1 })
      .exec();
    return usuarios.map(aRespuestaUsuario);
  }

  // Mismas reglas y validaciones que el registro, pero sin iniciar sesión
  // con el usuario creado (no devuelve token).
  async crear(dto: RegistroDto) {
    const usuario = await this.authService.crearUsuario(dto);
    return aRespuestaUsuario(usuario);
  }

  // Baja lógica: el usuario no se borra, queda sin poder ingresar.
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
