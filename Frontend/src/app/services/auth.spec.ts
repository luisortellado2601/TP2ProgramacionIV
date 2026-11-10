import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { environment } from '../../environments/environment';
import { AuthService } from './auth';
import { ModalService } from './modal';

const CLAVE_SESION = 'nextplay_sesion';
const VIDA_TOKEN_S = 30;

// JWT de prueba: solo importa el payload (iat/exp), la firma no se valida en el front.
function tokenDeVidaCorta(): string {
  const iat = Math.floor(Date.now() / 1000);
  const payload = btoa(JSON.stringify({ sub: 'u1', iat, exp: iat + VIDA_TOKEN_S }));
  return `cabecera.${payload}.firma`;
}

describe('AuthService: vencimiento de la sesión', () => {
  let authService: AuthService;
  let modalService: ModalService;
  let router: Router;
  let backend: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    localStorage.setItem(
      CLAVE_SESION,
      JSON.stringify({ usuario: { id: 'u1', nombre: 'Ana' }, token: tokenDeVidaCorta() }),
    );
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    backend = TestBed.inject(HttpTestingController);
    modalService = TestBed.inject(ModalService);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('a un tercio del final avisa con un modal persistente (no se cierra con el fondo)', () => {
    vi.advanceTimersByTime(20_000);

    const estado = modalService.estado();
    expect(estado?.tipo).toBe('confirmacion');
    expect(estado?.titulo).toBe('Sesión por vencer');
    expect(estado?.persistente).toBe(true);
    expect(authService.estaAutenticado()).toBe(true);
  });

  it('si no extiende, al vencer cierra la sesión, avisa y va al login sin esperar un 401', () => {
    vi.advanceTimersByTime(20_000); // aparece el aviso y se ignora
    vi.advanceTimersByTime(10_000); // llega el vencimiento

    expect(authService.estaAutenticado()).toBe(false);
    expect(localStorage.getItem(CLAVE_SESION)).toBeNull();
    expect(modalService.estado()?.titulo).toBe('Sesión expirada');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('si extiende, el vencimiento viejo se cancela y no cierra la sesión', () => {
    vi.advanceTimersByTime(20_000);
    modalService.estado()?.onConfirmar?.();
    backend
      .expectOne(`${environment.apiUrl}/auth/refrescar`)
      .flush({ usuario: { id: 'u1', nombre: 'Ana' }, token: tokenDeVidaCorta() });

    vi.advanceTimersByTime(10_000); // acá habría vencido el token anterior

    expect(authService.estaAutenticado()).toBe(true);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('al cerrar sesión a mano no queda ningún aviso pendiente', () => {
    authService.logout();
    vi.advanceTimersByTime(60_000);

    expect(modalService.estado()).toBeNull();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
