import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { EMPTY, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService, MENSAJE_SESION_EXPIRADA } from '../services/auth';
import { ModalService } from '../services/modal';

// En estas rutas un 401 significa "credenciales incorrectas": lo maneja la pantalla
// de login (con su propio modal), no es una sesión vencida.
const RUTAS_PUBLICAS = ['/auth/login', '/auth/registro'];

export const authInterceptor: HttpInterceptorFn = (peticion, siguiente) => {
  const authService = inject(AuthService);
  const modalService = inject(ModalService);
  const router = inject(Router);

  // El token solo se manda a nuestra API, nunca a otros dominios.
  const esDeLaApi = peticion.url.startsWith(environment.apiUrl);
  const esPublica = RUTAS_PUBLICAS.some((ruta) => peticion.url === `${environment.apiUrl}${ruta}`);
  const token = authService.obtenerToken();

  const peticionFinal =
    esDeLaApi && token
      ? peticion.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : peticion;

  return siguiente(peticionFinal).pipe(
    catchError((error: unknown) => {
      // Un 401 en una ruta protegida de la API, enviada con un token, es una sesión vencida o inválida.
      const sesionInvalida =
        esDeLaApi &&
        !esPublica &&
        !!token &&
        error instanceof HttpErrorResponse &&
        error.status === 401;

      if (!sesionInvalida) {
        return throwError(() => error);
      }

      // Solo se cierra la sesión si sigue siendo la que mandó este pedido: si varias
      // peticiones fallan a la vez, la primera la cierra y avisa; las demás (o una
      // respuesta tardía de un token viejo cuando ya hay otra sesión) no repiten nada.
      if (authService.obtenerToken() === token) {
        authService.logout();
        modalService.error(MENSAJE_SESION_EXPIRADA, 'Sesión expirada');
        void router.navigateByUrl('/login');
      }
      // En todos los casos se corta el flujo sin error, para que los componentes no
      // pisen este aviso con su propio modal de "no pudimos cargar...".
      return EMPTY;
    }),
  );
};
