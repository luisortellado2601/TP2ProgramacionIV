import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { environment } from '../../environments/environment';
import { AuthService } from './auth';
import { ModalService } from './modal';

const CLAVE_SESION = 'nextplay_sesion';
const VIDA_TOKEN_S = 60;

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

  it('30 segundos antes del final avisa con un modal persistente (no se cierra con el fondo)', () => {
    vi.advanceTimersByTime(30_000);

    const estado = modalService.estado();
    expect(estado?.tipo).toBe('confirmacion');
    expect(estado?.titulo).toBe('Sesión por vencer');
    expect(estado?.persistente).toBe(true);
    expect(authService.estaAutenticado()).toBe(true);
  });

  it('si no extiende, al vencer solo cierra el aviso: no cierra la sesión ni va al login', () => {
    vi.advanceTimersByTime(30_000);
    vi.advanceTimersByTime(30_000);

    expect(modalService.estado()).toBeNull();
    expect(authService.estaAutenticado()).toBe(true);
    expect(localStorage.getItem(CLAVE_SESION)).not.toBeNull();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('al vencer no cierra un modal que no sea el aviso de sesión', () => {
    vi.advanceTimersByTime(30_000);
    modalService.error('otro', 'Otro');
    vi.advanceTimersByTime(30_000);

    expect(modalService.estado()?.titulo).toBe('Otro');
  });

  it('si extiende, el vencimiento viejo se cancela y no cierra la sesión', () => {
    vi.advanceTimersByTime(30_000);
    modalService.estado()?.onConfirmar?.();
    backend
      .expectOne(`${environment.apiUrl}/auth/refrescar`)
      .flush({ usuario: { id: 'u1', nombre: 'Ana' }, token: tokenDeVidaCorta() });

    vi.advanceTimersByTime(30_000);

    expect(authService.estaAutenticado()).toBe(true);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('con el reloj de la PC adelantado respecto del servidor igual avisa 30 segundos antes del final', () => {
    const iat = Math.floor(Date.now() / 1000) - 78;
    const payload = btoa(JSON.stringify({ sub: 'u1', iat, exp: iat + 60 }));
    authService.login({ usuarioOCorreo: 'ana', contrasena: 'x' }).subscribe();
    backend
      .expectOne(`${environment.apiUrl}/auth/login`)
      .flush({ usuario: { id: 'u1', nombre: 'Ana' }, token: `cabecera.${payload}.firma` });

    vi.advanceTimersByTime(29_000);
    expect(modalService.estado()).toBeNull();
    vi.advanceTimersByTime(2_000);

    expect(modalService.estado()?.titulo).toBe('Sesión por vencer');
    expect(authService.estaAutenticado()).toBe(true);
  });

  it('al cerrar sesión a mano no queda ningún aviso pendiente', () => {
    authService.logout();
    vi.advanceTimersByTime(60_000);

    expect(modalService.estado()).toBeNull();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
