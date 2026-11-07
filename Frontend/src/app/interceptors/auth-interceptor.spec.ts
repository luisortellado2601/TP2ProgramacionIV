import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth';
import { ModalService } from '../services/modal';
import { authInterceptor } from './auth-interceptor';

const CLAVE_SESION = 'nextplay_sesion';
const SESION = { usuario: { id: 'u1', nombre: 'Ana' }, token: 'token-de-prueba' };

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let authService: AuthService;
  let modalService: ModalService;
  let router: Router;

  // La sesión se lee de localStorage al crear AuthService, así que se carga antes de inyectar.
  function configurar(conSesion: boolean): void {
    localStorage.clear();
    if (conSesion) {
      localStorage.setItem(CLAVE_SESION, JSON.stringify(SESION));
    }
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    modalService = TestBed.inject(ModalService);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  }

  afterEach(() => {
    backend.verify();
    localStorage.clear();
  });

  it('agrega el token Bearer a las peticiones de la API', () => {
    configurar(true);
    http.get(`${environment.apiUrl}/publicaciones`).subscribe();

    const peticion = backend.expectOne(`${environment.apiUrl}/publicaciones`);
    expect(peticion.request.headers.get('Authorization')).toBe('Bearer token-de-prueba');
    peticion.flush({});
  });

  it('no manda encabezado Authorization si no hay sesión', () => {
    configurar(false);
    http.get(`${environment.apiUrl}/publicaciones`).subscribe();

    const peticion = backend.expectOne(`${environment.apiUrl}/publicaciones`);
    expect(peticion.request.headers.has('Authorization')).toBe(false);
    peticion.flush({});
  });

  it('no manda el token a dominios que no son la API', () => {
    configurar(true);
    http.get('https://otro-dominio.com/datos').subscribe();

    const peticion = backend.expectOne('https://otro-dominio.com/datos');
    expect(peticion.request.headers.has('Authorization')).toBe(false);
    peticion.flush({});
  });

  it('ante un 401 cierra la sesión, avisa, va al login y no propaga el error', () => {
    configurar(true);
    const alError = vi.fn();
    http.get(`${environment.apiUrl}/publicaciones`).subscribe({ error: alError });

    backend
      .expectOne(`${environment.apiUrl}/publicaciones`)
      .flush({ message: 'vencido' }, { status: 401, statusText: 'Unauthorized' });

    expect(authService.estaAutenticado()).toBe(false);
    expect(localStorage.getItem(CLAVE_SESION)).toBeNull();
    expect(modalService.estado()?.titulo).toBe('Sesión expirada');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
    expect(alError).not.toHaveBeenCalled();
  });

  it('si fallan varias peticiones a la vez con 401, avisa una sola vez y ninguna propaga el error', () => {
    configurar(true);
    const alError = vi.fn();
    http.get(`${environment.apiUrl}/a`).subscribe({ error: alError });
    http.get(`${environment.apiUrl}/b`).subscribe({ error: alError });

    const respuesta = { status: 401, statusText: 'Unauthorized' };
    backend.expectOne(`${environment.apiUrl}/a`).flush({}, respuesta);
    backend.expectOne(`${environment.apiUrl}/b`).flush({}, respuesta);

    expect(router.navigateByUrl).toHaveBeenCalledTimes(1);
    expect(alError).not.toHaveBeenCalled();
  });

  it('una respuesta 401 tardía de un token viejo no cierra la sesión nueva', () => {
    configurar(true);
    http.get(`${environment.apiUrl}/lenta`).subscribe();
    const lenta = backend.expectOne(`${environment.apiUrl}/lenta`);

    // Mientras tanto el usuario volvió a iniciar sesión con otro token.
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ ...SESION, token: 'token-nuevo' }));
    (authService as unknown as { sesion: { set: (valor: unknown) => void } }).sesion.set({
      ...SESION,
      token: 'token-nuevo',
    });
    lenta.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authService.estaAutenticado()).toBe(true);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('un 401 en el login (credenciales incorrectas) llega al componente sin cerrar nada', () => {
    configurar(true);
    const alError = vi.fn();
    http.post(`${environment.apiUrl}/auth/login`, {}).subscribe({ error: alError });

    backend
      .expectOne(`${environment.apiUrl}/auth/login`)
      .flush({ message: 'mal' }, { status: 401, statusText: 'Unauthorized' });

    expect(alError).toHaveBeenCalled();
    expect(authService.estaAutenticado()).toBe(true);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('otros errores (por ejemplo 403) se propagan sin tocar la sesión', () => {
    configurar(true);
    const alError = vi.fn();
    http.delete(`${environment.apiUrl}/publicaciones/1`).subscribe({ error: alError });

    backend
      .expectOne(`${environment.apiUrl}/publicaciones/1`)
      .flush({ message: 'no' }, { status: 403, statusText: 'Forbidden' });

    expect(alError).toHaveBeenCalled();
    expect(authService.estaAutenticado()).toBe(true);
  });
});
