import { Type } from 'class-transformer';
import { IsIn, IsInt, IsMongoId, IsOptional, Max, Min } from 'class-validator';

export class ListarPublicacionesDto {
  @IsOptional()
  @IsIn(['fecha', 'likes'], { message: 'El orden debe ser "fecha" o "likes"' })
  orden: 'fecha' | 'likes' = 'fecha';

  @IsOptional()
  @IsMongoId({ message: 'El usuario no es válido' })
  usuario?: string;

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
