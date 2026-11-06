import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { recortar } from '../../auth/dto/transformadores.js';

export class CrearPublicacionDto {
  @Transform(recortar)
  @IsString({ message: 'El título es obligatorio' })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  @MinLength(2, { message: 'El título debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El título no puede superar los 100 caracteres' })
  titulo: string;

  @Transform(recortar)
  @IsString({ message: 'El mensaje es obligatorio' })
  @IsNotEmpty({ message: 'El mensaje es obligatorio' })
  @MaxLength(2000, {
    message: 'El mensaje no puede superar los 2000 caracteres',
  })
  mensaje: string;

  // Imagen opcional como data URL en base64; tipo y tamaño se validan al subirla.
  @IsOptional()
  @IsString({ message: 'La imagen no es válida' })
  @Matches(/^data:image\/(jpeg|png|webp);base64,/, {
    message: 'La imagen debe ser un archivo JPG, PNG o WEBP',
  })
  imagen?: string;
}
