import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ComentariosService } from './comentarios.service.js';
import { CrearComentarioDto } from './dto/crear-comentario.dto.js';
import { ActualizarComentarioDto } from './dto/actualizar-comentario.dto.js';
import { ListarComentariosDto } from './dto/listar-comentarios.dto.js';
import { UsuarioActual } from '../auth/decoradores/usuario-actual.decorator.js';

// Sin prefijo: las rutas se escriben completas en cada decorador porque
// mezclan `publicaciones/:id/comentarios` y `comentarios/:id`.
@Controller()
export class ComentariosController {
  constructor(private readonly comentariosService: ComentariosService) {}

  @Post('publicaciones/:publicacionId/comentarios')
  crear(
    @Param('publicacionId') publicacionId: string,
    @UsuarioActual() usuarioId: string,
    @Body() dto: CrearComentarioDto,
  ) {
    return this.comentariosService.crear(publicacionId, usuarioId, dto);
  }

  @Get('publicaciones/:publicacionId/comentarios')
  listar(
    @Param('publicacionId') publicacionId: string,
    @Query() dto: ListarComentariosDto,
  ) {
    return this.comentariosService.listar(publicacionId, dto);
  }

  @Put('comentarios/:id')
  actualizar(
    @Param('id') id: string,
    @UsuarioActual() usuarioId: string,
    @Body() dto: ActualizarComentarioDto,
  ) {
    return this.comentariosService.actualizar(id, usuarioId, dto);
  }
}
