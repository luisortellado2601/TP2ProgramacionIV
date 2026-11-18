import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { PerfilUsuario } from '../models/usuario';


export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.usuarioActual()?.perfil === PerfilUsuario.ADMINISTRADOR) {
    return true;
  }
  return router.createUrlTree(['/publicaciones']);
};
