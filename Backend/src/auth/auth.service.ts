import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { Usuario, UsuarioDocument } from '../usuarios/usuario.schema.js';
import { RegistroDto } from './dto/registro.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { PasswordHasher } from './password-hasher.js';
import { AlmacenamientoService } from '../almacenamiento/almacenamiento.service.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Usuario.name)
    private readonly usuarioModel: Model<UsuarioDocument>,
    private readonly passwordHasher: PasswordHasher,
    private readonly jwtService: JwtService,
    private readonly almacenamientoService: AlmacenamientoService,
  ) {}

  async registro(dto: RegistroDto) {
    if (dto.contrasena !== dto.repetirContrasena) {
      throw new BadRequestException('Las contraseñas no coinciden');
    }

    const existente = await this.usuarioModel
      .findOne({
        $or: [{ correo: dto.correo }, { nombreUsuario: dto.nombreUsuario }],
      })
      .exec();
    if (existente) {
      const campo =
        existente.correo === dto.correo ? 'correo' : 'nombre de usuario';
      throw new ConflictException(
        `Ya existe un usuario registrado con ese ${campo}`,
      );
    }

    // Se sube después de validar duplicados para no dejar imágenes huérfanas.
    const imagenPerfilUrl = dto.imagenPerfil
      ? await this.almacenamientoService.subirImagen(
          dto.imagenPerfil,
          'perfiles',
        )
      : undefined;

    const usuario = await this.usuarioModel.create({
      nombre: dto.nombre,
      apellido: dto.apellido,
      correo: dto.correo,
      nombreUsuario: dto.nombreUsuario,
      contrasena: this.passwordHasher.hash(dto.contrasena),
      fechaNacimiento: dto.fechaNacimiento,
      descripcion: dto.descripcion,
      imagenPerfilUrl,
      perfil: dto.perfil,
    });

    return this.construirRespuesta(usuario);
  }

  async login(dto: LoginDto) {
    const usuario = await this.usuarioModel
      .findOne({
        $or: [
          // Los correos se guardan en minúsculas; el nombre de usuario se respeta tal cual.
          { correo: dto.usuarioOCorreo.toLowerCase() },
          { nombreUsuario: dto.usuarioOCorreo },
        ],
      })
      .exec();

    if (
      !usuario ||
      !this.passwordHasher.verify(dto.contrasena, usuario.contrasena)
    ) {
      throw new UnauthorizedException(
        'Usuario/correo o contraseña incorrectos',
      );
    }

    if (!usuario.habilitado) {
      throw new UnauthorizedException('El usuario se encuentra deshabilitado');
    }

    return this.construirRespuesta(usuario);
  }

  private async construirRespuesta(usuario: UsuarioDocument) {
    const payload = {
      sub: usuario._id.toString(),
      correo: usuario.correo,
      nombreUsuario: usuario.nombreUsuario,
      perfil: usuario.perfil,
    };
    const token = await this.jwtService.signAsync(payload);

    return {
      usuario: {
        id: usuario._id.toString(),
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        correo: usuario.correo,
        nombreUsuario: usuario.nombreUsuario,
        fechaNacimiento: usuario.fechaNacimiento,
        descripcion: usuario.descripcion,
        imagenPerfilUrl: usuario.imagenPerfilUrl,
        perfil: usuario.perfil,
        habilitado: usuario.habilitado,
        fechaAlta: usuario.fechaAlta,
      },
      token,
    };
  }
}
