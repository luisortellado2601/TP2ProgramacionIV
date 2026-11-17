import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { recortar } from '../../auth/dto/transformadores.js';
import { FechaNacimientoValida } from '../../auth/dto/fecha-nacimiento-valida.validator.js';
import { PATRON_NOMBRE } from '../../auth/dto/registro.dto.js';

export class ActualizarPerfilDto {
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
  @IsString({ message: 'La imagen de perfil no es válida' })
  @Matches(/^data:image\/(jpeg|png|webp);base64,/, {
    message: 'La imagen de perfil debe ser un archivo JPG, PNG o WEBP',
  })
  imagenPerfil?: string;
}
