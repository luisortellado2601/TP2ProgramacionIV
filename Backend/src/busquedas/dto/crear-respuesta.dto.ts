import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { recortar } from '../../auth/dto/transformadores.js';

export class CrearRespuestaDto {
  @Transform(recortar)
  @IsString({ message: 'El mensaje es obligatorio' })
  @IsNotEmpty({ message: 'El mensaje es obligatorio' })
  @MaxLength(500, { message: 'El mensaje no puede superar los 500 caracteres' })
  mensaje: string;
}
