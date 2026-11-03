import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ComentariosService } from './comentarios.service.js';
import { CrearComentarioDto } from './dto/crear-comentario.dto.js';
import { ListarComentariosDto } from './dto/listar-comentarios.dto.js';

// Sin prefijo: el Sprint #3 suma `PUT /comentarios/:id` en este mismo controller.
@Controller()
export class ComentariosController {
  constructor(private readonly comentariosService: ComentariosService) {}

  @Post('publicaciones/:publicacionId/comentarios')
  crear(
    @Param('publicacionId') publicacionId: string,
    @Body() dto: CrearComentarioDto,
  ) {
    return this.comentariosService.crear(publicacionId, dto);
  }

  @Get('publicaciones/:publicacionId/comentarios')
  listar(
    @Param('publicacionId') publicacionId: string,
    @Query() dto: ListarComentariosDto,
  ) {
    return this.comentariosService.listar(publicacionId, dto);
  }
}
