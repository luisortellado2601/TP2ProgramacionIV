import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PLATAFORMAS, REGIONES } from '../opciones.js';

export class ListarBusquedasDto {
  @IsOptional()
  @IsString({ message: 'El juego no es válido' })
  @MaxLength(60, { message: 'El juego no puede superar los 60 caracteres' })
  juego?: string;

  @IsOptional()
  @IsIn(REGIONES, { message: `La región debe ser: ${REGIONES.join(', ')}` })
  region?: string;

  @IsOptional()
  @IsIn(PLATAFORMAS, {
    message: `La plataforma debe ser: ${PLATAFORMAS.join(', ')}`,
  })
  plataforma?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El offset debe ser un número entero' })
  @Min(0, { message: 'El offset no puede ser negativo' })
  offset: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero' })
  @Min(1, { message: 'El límite debe ser mayor a 0' })
  @Max(50, { message: 'El límite no puede superar 50' })
  limit: number = 10;
}
