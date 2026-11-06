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
import { UsuarioActual } from '../auth/decoradores/usuario-actual.decorator.js';

// El actor (autor, quien da like o elimina) sale siempre del token validado
// por el JwtAuthGuard global, nunca del body ni de la query.
@Controller('publicaciones')
export class PublicacionesController {
  constructor(private readonly publicacionesService: PublicacionesService) {}

  @Post()
  crear(@UsuarioActual() usuarioId: string, @Body() dto: CrearPublicacionDto) {
    return this.publicacionesService.crear(usuarioId, dto);
  }

  @Get()
  listar(@Query() dto: ListarPublicacionesDto) {
    return this.publicacionesService.listar(dto);
  }

  @Delete(':id')
  eliminar(@Param('id') id: string, @UsuarioActual() usuarioId: string) {
    return this.publicacionesService.eliminar(id, usuarioId);
  }

  @Post(':id/like')
  @HttpCode(HttpStatus.OK)
  darLike(@Param('id') id: string, @UsuarioActual() usuarioId: string) {
    return this.publicacionesService.darLike(id, usuarioId);
  }

  @Delete(':id/like')
  quitarLike(@Param('id') id: string, @UsuarioActual() usuarioId: string) {
    return this.publicacionesService.quitarLike(id, usuarioId);
  }
}
