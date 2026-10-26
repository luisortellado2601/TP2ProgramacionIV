import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PerfilUsuario } from '../../usuarios/usuario.schema.js';
import { recortar, recortarYMinusculas } from './transformadores.js';
import { FechaNacimientoValida } from './fecha-nacimiento-valida.validator.js';

// Mismas reglas que el formulario de registro del front.
const PATRON_NOMBRE = /^[\p{L}' -]+$/u;
const PATRON_NOMBRE_USUARIO = /^[A-Za-z0-9._]+$/;
const PATRON_CONTRASENA = /^(?=.*[A-Z])(?=.*\d).+$/;

export class RegistroDto {
  @Transform(recortar)
  @IsString({ message: 'El nombre es obligatorio' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El nombre no puede superar los 50 caracteres' })
  @Matches(PATRON_NOMBRE, {
    message:
      'El nombre solo puede contener letras, espacios, apóstrofes y guiones',
  })
  nombre: string;

  @Transform(recortar)
  @IsString({ message: 'El apellido es obligatorio' })
  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El apellido no puede superar los 50 caracteres' })
  @Matches(PATRON_NOMBRE, {
    message:
      'El apellido solo puede contener letras, espacios, apóstrofes y guiones',
  })
  apellido: string;

  @Transform(recortarYMinusculas)
  @IsString({ message: 'El correo es obligatorio' })
  @IsNotEmpty({ message: 'El correo es obligatorio' })
  @MaxLength(100, { message: 'El correo no puede superar los 100 caracteres' })
  @IsEmail({}, { message: 'El correo no tiene un formato válido' })
  correo: string;

  @Transform(recortar)
  @IsString({ message: 'El nombre de usuario es obligatorio' })
  @IsNotEmpty({ message: 'El nombre de usuario es obligatorio' })
  @MinLength(3, {
    message: 'El nombre de usuario debe tener al menos 3 caracteres',
  })
  @MaxLength(20, {
    message: 'El nombre de usuario no puede superar los 20 caracteres',
  })
  @Matches(PATRON_NOMBRE_USUARIO, {
    message:
      'El nombre de usuario solo puede contener letras, números, puntos y guiones bajos (sin espacios)',
  })
  nombreUsuario: string;

  @IsString({ message: 'La contraseña es obligatoria' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(64, {
    message: 'La contraseña no puede superar los 64 caracteres',
  })
  @Matches(PATRON_CONTRASENA, {
    message: 'La contraseña debe tener al menos una mayúscula y un número',
  })
  contrasena: string;

  @IsString({ message: 'Debe repetir la contraseña' })
  @IsNotEmpty({ message: 'Debe repetir la contraseña' })
  repetirContrasena: string;

  @IsDateString({}, { message: 'La fecha de nacimiento no es válida' })
  @FechaNacimientoValida({
    message: 'La fecha de nacimiento no puede ser futura ni anterior a 1900',
  })
  fechaNacimiento: string;

  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'La descripción debe ser un texto' })
  @MaxLength(280, {
    message: 'La descripción no puede superar los 280 caracteres',
  })
  descripcion?: string;

  @IsOptional()
  @IsEnum(PerfilUsuario, {
    message: 'El perfil debe ser usuario o administrador',
  })
  perfil?: PerfilUsuario;

  // Imagen como data URL en base64; tipo y tamaño se validan al subirla.
  @IsOptional()
  @IsString({ message: 'La imagen de perfil no es válida' })
  @Matches(/^data:image\/(jpeg|png|webp);base64,/, {
    message: 'La imagen de perfil debe ser un archivo JPG, PNG o WEBP',
  })
  imagenPerfil?: string;
}
