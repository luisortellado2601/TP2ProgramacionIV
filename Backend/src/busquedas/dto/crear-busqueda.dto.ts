import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { recortar } from '../../auth/dto/transformadores.js';
import { PLATAFORMAS, REGIONES } from '../opciones.js';

export class CrearBusquedaDto {
  @Transform(recortar)
  @IsString({ message: 'El juego es obligatorio' })
  @IsNotEmpty({ message: 'El juego es obligatorio' })
  @MinLength(2, { message: 'El juego debe tener al menos 2 caracteres' })
  @MaxLength(60, { message: 'El juego no puede superar los 60 caracteres' })
  juego: string;

  @IsIn(REGIONES, { message: `La región debe ser: ${REGIONES.join(', ')}` })
  region: string;

  @IsIn(PLATAFORMAS, {
    message: `La plataforma debe ser: ${PLATAFORMAS.join(', ')}`,
  })
  plataforma: string;

  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'La descripción no es válida' })
  @MaxLength(280, {
    message: 'La descripción no puede superar los 280 caracteres',
  })
  descripcion?: string;
}
