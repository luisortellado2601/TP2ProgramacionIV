import { Controller, Get, Query } from '@nestjs/common';
import { EstadisticasService } from './estadisticas.service.js';
import {
  RangoFechasConLimiteDto,
  RangoFechasDto,
} from './dto/rango-fechas.dto.js';
import { PerfilUsuario } from '../usuarios/usuario.schema.js';
import { Roles } from '../auth/decoradores/roles.decorator.js';

// Solo administradores. Todas las rutas aceptan `desde` y `hasta` (lapso).
@Roles(PerfilUsuario.ADMINISTRADOR)
@Controller('estadisticas')
export class EstadisticasController {
  constructor(private readonly estadisticasService: EstadisticasService) {}

  @Get('publicaciones-por-usuario')
  publicacionesPorUsuario(@Query() dto: RangoFechasConLimiteDto) {
    return this.estadisticasService.publicacionesPorUsuario(dto, dto.limit);
  }

  @Get('comentarios')
  comentarios(@Query() dto: RangoFechasDto) {
    return this.estadisticasService.comentarios(dto);
  }

  @Get('comentarios-por-publicacion')
  comentariosPorPublicacion(@Query() dto: RangoFechasConLimiteDto) {
    return this.estadisticasService.comentariosPorPublicacion(dto, dto.limit);
  }
}
