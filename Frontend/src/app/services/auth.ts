import { Service, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ActualizarPerfilPayload,
  LoginPayload,
  RegistroPayload,
  SesionResponse,
  Usuario,
} from '../models/usuario';
import { ModalService } from './modal';
import { decodificarPayloadToken } from '../utils/jwt';
import { formatearDuracion } from '../utils/formatear-duracion';

const CLAVE_SESION = 'nextplay_sesion';
const CLAVE_TOKEN_RECIBIDO = 'nextplay_token_recibido';

const AVISO_ANTES_DE_VENCER_MS = 30 * 1000;

const TITULO_SESION_POR_VENCER = 'Sesión por vencer';

export const MENSAJE_SESION_EXPIRADA =
  'Tu token venció o ya no es válido, por lo que no tenés autorización para realizar esta operación. Iniciá sesión nuevamente para continuar.';

@Service()
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly modalService = inject(ModalService);
  private readonly sesion = signal<SesionResponse | null>(this.leerSesionGuardada());
  private temporizadorAviso: ReturnType<typeof setTimeout> | null = null;
  private temporizadorVencimiento: ReturnType<typeof setTimeout> | null = null;

  readonly usuarioActual = computed<Usuario | null>(() => this.sesion()?.usuario ?? null);
  readonly estaAutenticado = computed<boolean>(() => this.sesion() !== null);

  constructor() {
    const sesionGuardada = this.sesion();
    if (sesionGuardada) {
      this.iniciarContadorSesion(
        sesionGuardada.token,
        this.leerTokenRecibido(sesionGuardada.token),
      );
    }
  }

  registro(payload: RegistroPayload): Observable<SesionResponse> {
    return this.http
      .post<SesionResponse>(`${environment.apiUrl}/auth/registro`, payload)
      .pipe(tap((respuesta) => this.guardarSesion(respuesta)));
  }

  login(payload: LoginPayload): Observable<SesionResponse> {
    return this.http
      .post<SesionResponse>(`${environment.apiUrl}/auth/login`, payload)
      .pipe(tap((respuesta) => this.guardarSesion(respuesta)));
  }

  autorizar(): Observable<{ usuario: Usuario }> {
    return this.http
      .post<{ usuario: Usuario }>(`${environment.apiUrl}/auth/autorizar`, {})
      .pipe(tap(({ usuario }) => this.actualizarUsuario(usuario)));
  }

  refrescar(): Observable<SesionResponse> {
    return this.http
      .post<SesionResponse>(`${environment.apiUrl}/auth/refrescar`, {})
      .pipe(tap((respuesta) => this.guardarSesion(respuesta)));
  }

  actualizarPerfil(payload: ActualizarPerfilPayload): Observable<Usuario> {
    return this.http
      .put<Usuario>(`${environment.apiUrl}/usuarios/me`, payload)
      .pipe(tap((usuario) => this.actualizarUsuario(usuario)));
  }

  logout(): void {
    this.sesion.set(null);
    localStorage.removeItem(CLAVE_SESION);
    localStorage.removeItem(CLAVE_TOKEN_RECIBIDO);
    this.cancelarContadorSesion();
  }

  obtenerToken(): string | null {
    return this.sesion()?.token ?? null;
  }

  private guardarSesion(respuesta: SesionResponse): void {
    this.sesion.set(respuesta);
    localStorage.setItem(CLAVE_SESION, JSON.stringify(respuesta));
    const recibidoEn = Date.now();
    localStorage.setItem(CLAVE_TOKEN_RECIBIDO, String(recibidoEn));
    this.iniciarContadorSesion(respuesta.token, recibidoEn);
  }

  private leerTokenRecibido(token: string): number {
    const guardado = Number(localStorage.getItem(CLAVE_TOKEN_RECIBIDO));
    if (Number.isFinite(guardado) && guardado > 0) {
      return guardado;
    }
    const payload = decodificarPayloadToken(token);
    return payload ? payload.iat * 1000 : Date.now();
  }

  private actualizarUsuario(usuario: Usuario): void {
    const sesionActual = this.sesion();
    if (!sesionActual) {
      return;
    }
    const sesionActualizada: SesionResponse = { ...sesionActual, usuario };
    this.sesion.set(sesionActualizada);
    localStorage.setItem(CLAVE_SESION, JSON.stringify(sesionActualizada));
  }

  private leerSesionGuardada(): SesionResponse | null {
    const guardada = localStorage.getItem(CLAVE_SESION);
    if (!guardada) {
      return null;
    }
    try {
      return JSON.parse(guardada) as SesionResponse;
    } catch {
      localStorage.removeItem(CLAVE_SESION);
      return null;
    }
  }

  private iniciarContadorSesion(token: string, recibidoEn: number): void {
    this.cancelarContadorSesion();
    const payload = decodificarPayloadToken(token);
    if (!payload) {
      return;
    }
    const duracionMs = (payload.exp - payload.iat) * 1000;
    const vencimientoMs = recibidoEn + duracionMs;
    const avisoEnMs = vencimientoMs - AVISO_ANTES_DE_VENCER_MS - Date.now();
    if (vencimientoMs - Date.now() <= 0) {
      return;
    }
    this.temporizadorAviso = setTimeout(
      () => this.avisarVencimientoProximo(vencimientoMs),
      Math.max(avisoEnMs, 0),
    );
    this.temporizadorVencimiento = setTimeout(
      () => this.expirarSesion(),
      vencimientoMs - Date.now(),
    );
  }

  private cancelarContadorSesion(): void {
    if (this.temporizadorAviso) {
      clearTimeout(this.temporizadorAviso);
      this.temporizadorAviso = null;
    }
    if (this.temporizadorVencimiento) {
      clearTimeout(this.temporizadorVencimiento);
      this.temporizadorVencimiento = null;
    }
  }

  private expirarSesion(): void {
    this.temporizadorVencimiento = null;
    if (this.modalService.estado()?.titulo === TITULO_SESION_POR_VENCER) {
      this.modalService.cerrar();
    }
  }

  private avisarVencimientoProximo(vencimientoMs: number): void {
    const restante = formatearDuracion(vencimientoMs - Date.now());
    this.modalService.confirmar(
      `Tu sesión vence en ${restante}. ¿Querés extenderla?`,
      () => {
        this.refrescar().subscribe({
          error: () => {
          },
        });
      },
      TITULO_SESION_POR_VENCER,
      true,
    );
  }
}
