import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { PublicacionesService } from './publicaciones.service.js';
import { CrearPublicacionDto } from './dto/crear-publicacion.dto.js';
import { ListarPublicacionesDto } from './dto/listar-publicaciones.dto.js';
import { UsuarioAccionDto } from './dto/usuario-accion.dto.js';

@Controller('publicaciones')
export class PublicacionesController {
  constructor(private readonly publicacionesService: PublicacionesService) {}

  @Post()
  crear(@Body() dto: CrearPublicacionDto) {
    return this.publicacionesService.crear(dto);
  }

  @Get()
  listar(@Query() dto: ListarPublicacionesDto) {
    return this.publicacionesService.listar(dto);
  }

  @Delete(':id')
  eliminar(@Param('id') id: string, @Query() dto: UsuarioAccionDto) {
    return this.publicacionesService.eliminar(id, dto.usuarioId);
  }

  @Post(':id/like')
  @HttpCode(HttpStatus.OK)
  darLike(@Param('id') id: string, @Body() dto: UsuarioAccionDto) {
    return this.publicacionesService.darLike(id, dto.usuarioId);
  }

  @Delete(':id/like')
  quitarLike(@Param('id') id: string, @Query() dto: UsuarioAccionDto) {
    return this.publicacionesService.quitarLike(id, dto.usuarioId);
  }
}
