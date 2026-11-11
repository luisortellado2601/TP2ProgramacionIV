import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

// Lapso elegible: `desde` y `hasta` son opcionales (sin ellos no se acota ese
// extremo). Aceptan "2026-11-01" o una fecha ISO completa; con solo la fecha,
// `hasta` incluye el día entero.
export class RangoFechasDto {
  @IsOptional()
  @IsDateString({}, { message: 'La fecha "desde" no es válida' })
  desde?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha "hasta" no es válida' })
  hasta?: string;
}

// Para los rankings: cuántos elementos devolver como máximo.
export class RangoFechasConLimiteDto extends RangoFechasDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero' })
  @Min(1, { message: 'El límite debe ser mayor a 0' })
  @Max(50, { message: 'El límite no puede superar 50' })
  limit: number = 10;
}
