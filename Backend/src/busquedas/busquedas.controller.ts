import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { BusquedasService } from './busquedas.service.js';
import { CrearBusquedaDto } from './dto/crear-busqueda.dto.js';
import { CrearRespuestaDto } from './dto/crear-respuesta.dto.js';
import { ListarBusquedasDto } from './dto/listar-busquedas.dto.js';
import { UsuarioActual } from '../auth/decoradores/usuario-actual.decorator.js';

@Controller('busquedas')
export class BusquedasController {
  constructor(private readonly busquedasService: BusquedasService) {}

  @Post()
  crear(@UsuarioActual() usuarioId: string, @Body() dto: CrearBusquedaDto) {
    return this.busquedasService.crear(usuarioId, dto);
  }

  @Get()
  listar(@Query() dto: ListarBusquedasDto) {
    return this.busquedasService.listar(dto);
  }

  @Post(':id/respuestas')
  responder(
    @Param('id') id: string,
    @UsuarioActual() usuarioId: string,
    @Body() dto: CrearRespuestaDto,
  ) {
    return this.busquedasService.responder(id, usuarioId, dto);
  }

  @Delete(':id')
  cerrar(@Param('id') id: string, @UsuarioActual() usuarioId: string) {
    return this.busquedasService.cerrar(id, usuarioId);
  }
}
