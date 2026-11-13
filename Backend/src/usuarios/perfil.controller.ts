import { Body, Controller, Put } from '@nestjs/common';
import { UsuariosService } from './usuarios.service.js';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto.js';
import { UsuarioActual } from '../auth/decoradores/usuario-actual.decorator.js';

// Perfil del propio usuario. Está aparte de UsuariosController porque ese es solo para
// administradores (@Roles); acá puede entrar cualquier usuario con sesión, y solo puede
// modificarse a sí mismo: el id sale del token, nunca del body ni de la URL.
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
