import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { recortar } from '../../auth/dto/transformadores.js';

export class CrearComentarioDto {
  @Transform(recortar)
  @IsString({ message: 'El comentario es obligatorio' })
  @IsNotEmpty({ message: 'El comentario es obligatorio' })
  @MaxLength(500, {
    message: 'El comentario no puede superar los 500 caracteres',
  })
  mensaje: string;
}
