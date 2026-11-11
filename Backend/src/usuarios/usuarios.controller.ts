import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { UsuariosService } from './usuarios.service.js';
import { PerfilUsuario } from './usuario.schema.js';
import { RegistroDto } from '../auth/dto/registro.dto.js';
import { Roles } from '../auth/decoradores/roles.decorator.js';
import { UsuarioActual } from '../auth/decoradores/usuario-actual.decorator.js';

// Solo administradores (RolesGuard consulta el perfil real en la base).
@Roles(PerfilUsuario.ADMINISTRADOR)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  listar() {
    return this.usuariosService.listar();
  }

  @Post()
  crear(@Body() dto: RegistroDto) {
    return this.usuariosService.crear(dto);
  }

  // Baja lógica (deshabilitar).
  @Delete(':id')
  deshabilitar(
    @Param('id') id: string,
    @UsuarioActual() solicitanteId: string,
  ) {
    return this.usuariosService.deshabilitar(id, solicitanteId);
  }

  // Alta lógica: rehabilita un usuario deshabilitado.
  @Post(':id/habilitar')
  @HttpCode(HttpStatus.OK)
  habilitar(@Param('id') id: string) {
    return this.usuariosService.habilitar(id);
  }
}
