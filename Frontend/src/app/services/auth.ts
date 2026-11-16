import { Service, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
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
// Hora local (ms) en que llegó el token guardado. El vencimiento se mide desde acá y no contra
// el `exp` del token, porque `exp` está en la hora del servidor y el reloj de la PC puede estar
// adelantado o atrasado: con tokens cortos eso hacía que el aviso nunca apareciera.
const CLAVE_TOKEN_RECIBIDO = 'nextplay_token_recibido';

// Aviso que se muestra cuando la sesión venció (por el temporizador o por un 401).
export const MENSAJE_SESION_EXPIRADA =
  'Tu sesión venció o ya no es válida. Iniciá sesión nuevamente para continuar.';

@Service()
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly modalService = inject(ModalService);
  private readonly router = inject(Router);
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

  // Confirma contra el back que el token guardado sigue valiendo y trae los
  // datos vigentes del usuario (lo usa la pantalla "Cargando" al iniciar la app).
  autorizar(): Observable<{ usuario: Usuario }> {
    return this.http
      .post<{ usuario: Usuario }>(`${environment.apiUrl}/auth/autorizar`, {})
      .pipe(tap(({ usuario }) => this.actualizarUsuario(usuario)));
  }

  // Pide un token nuevo con el mismo vencimiento desde ahora; lo usa el aviso
  // de "sesión por vencer" cuando el usuario decide extenderla.
  refrescar(): Observable<SesionResponse> {
    return this.http
      .post<SesionResponse>(`${environment.apiUrl}/auth/refrescar`, {})
      .pipe(tap((respuesta) => this.guardarSesion(respuesta)));
  }

  // Edita los datos del propio usuario. El token no cambia (no incluye nada editable), así que solo
  // se actualiza el usuario guardado: el nombre y la foto se renuevan en toda la app al instante.
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

  // Hora local en que se recibió el token guardado. Si falta (sesión de una versión anterior),
  // se usa el `iat` del token como mejor aproximación.
  private leerTokenRecibido(token: string): number {
    const guardado = Number(localStorage.getItem(CLAVE_TOKEN_RECIBIDO));
    if (Number.isFinite(guardado) && guardado > 0) {
      return guardado;
    }
    const payload = decodificarPayloadToken(token);
    return payload ? payload.iat * 1000 : Date.now();
  }

  // Actualiza solo los datos del usuario (p. ej. tras `autorizar`), sin tocar
  // el token ni reprogramar el aviso de vencimiento.
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

  // El aviso aparece cuando queda un tercio de la vida del token (p. ej. a los
  // 10 min de un token de 15, o a los 20 s de uno de prueba de 60): la
  // proporción escala sola en vez de depender de un valor fijo en minutos.
  // Solo se usa la duración (`exp - iat`) del token; el vencimiento se mide desde `recibidoEn`
  // (hora local), así no importa si el reloj de la PC no coincide con el del servidor.
  private iniciarContadorSesion(token: string, recibidoEn: number): void {
    this.cancelarContadorSesion();
    const payload = decodificarPayloadToken(token);
    if (!payload) {
      return;
    }
    const duracionMs = (payload.exp - payload.iat) * 1000;
    const vencimientoMs = recibidoEn + duracionMs;
    const avisoEnMs = vencimientoMs - duracionMs / 3 - Date.now();
    if (vencimientoMs - Date.now() <= 0) {
      return; // ya venció: el próximo pedido lo cierra el interceptor
    }
    this.temporizadorAviso = setTimeout(
      () => this.avisarVencimientoProximo(vencimientoMs),
      Math.max(avisoEnMs, 0),
    );
    // Si el usuario ignora o cancela el aviso, al llegar el vencimiento la sesión
    // se cierra sola en vez de esperar a que un pedido devuelva 401.
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
    this.logout();
    this.modalService.error(MENSAJE_SESION_EXPIRADA, 'Sesión expirada');
    void this.router.navigateByUrl('/login');
  }

  private avisarVencimientoProximo(vencimientoMs: number): void {
    const restante = formatearDuracion(vencimientoMs - Date.now());
    this.modalService.confirmar(
      `Tu sesión vence en ${restante}. ¿Querés extenderla?`,
      () => {
        this.refrescar().subscribe({
          error: () => {
            // Si falla, el próximo pedido real lo maneja el interceptor (401 → login).
          },
        });
      },
      'Sesión por vencer',
      true,
    );
  }
}
