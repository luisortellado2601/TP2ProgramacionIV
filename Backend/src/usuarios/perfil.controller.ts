import { Body, Controller, Put } from '@nestjs/common';
import { UsuariosService } from './usuarios.service.js';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto.js';
import { UsuarioActual } from '../auth/decoradores/usuario-actual.decorator.js';

@Controller('usuarios')
export class PerfilController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Put('me')
  actualizar(
    @UsuarioActual() usuarioId: string,
    @Body() dto: ActualizarPerfilDto,
  ) {
    return this.usuariosService.actualizarPerfil(usuarioId, dto);
  }
}
