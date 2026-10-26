import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { recortar } from './transformadores.js';

export class LoginDto {
  @Transform(recortar)
  @IsString({ message: 'Debe indicar el usuario o correo' })
  @IsNotEmpty({ message: 'Debe indicar el usuario o correo' })
  @MaxLength(100, {
    message: 'El usuario o correo no puede superar los 100 caracteres',
  })
  usuarioOCorreo: string;

  @IsString({ message: 'Debe indicar la contraseña' })
  @IsNotEmpty({ message: 'Debe indicar la contraseña' })
  @MaxLength(64, {
    message: 'La contraseña no puede superar los 64 caracteres',
  })
  contrasena: string;
}
