import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { EMPTY, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService, MENSAJE_SESION_EXPIRADA } from '../services/auth';
import { ModalService } from '../services/modal';

const RUTAS_PUBLICAS = ['/auth/login', '/auth/registro'];

export const authInterceptor: HttpInterceptorFn = (peticion, siguiente) => {
  const authService = inject(AuthService);
  const modalService = inject(ModalService);
  const router = inject(Router);

  const esDeLaApi = peticion.url.startsWith(environment.apiUrl);
  const esPublica = RUTAS_PUBLICAS.some((ruta) => peticion.url === `${environment.apiUrl}${ruta}`);
  const token = authService.obtenerToken();

  const peticionFinal =
    esDeLaApi && token
      ? peticion.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : peticion;

  return siguiente(peticionFinal).pipe(
    catchError((error: unknown) => {
      const sesionInvalida =
        esDeLaApi &&
        !esPublica &&
        !!token &&
        error instanceof HttpErrorResponse &&
        error.status === 401;

      if (!sesionInvalida) {
        return throwError(() => error);
      }

      if (authService.obtenerToken() === token) {
        authService.logout();
        modalService.error(MENSAJE_SESION_EXPIRADA, 'Sesión expirada');
        void router.navigateByUrl('/login');
      }
      return EMPTY;
    }),
  );
};
