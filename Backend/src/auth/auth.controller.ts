import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegistroDto } from './dto/registro.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { Public } from './decoradores/public.decorator.js';
import { UsuarioActual } from './decoradores/usuario-actual.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('registro')
  @HttpCode(HttpStatus.CREATED)
  registro(@Body() dto: RegistroDto) {
    return this.authService.registro(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('autorizar')
  @HttpCode(HttpStatus.OK)
  autorizar(@UsuarioActual() usuarioId: string) {
    return this.authService.autorizar(usuarioId);
  }

  @Post('refrescar')
  @HttpCode(HttpStatus.OK)
  refrescar(@UsuarioActual() usuarioId: string) {
    return this.authService.refrescar(usuarioId);
  }
}
