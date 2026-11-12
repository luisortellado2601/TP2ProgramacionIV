import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { RegistroPayload, Usuario } from '../models/usuario';

// Rutas de administrador: requieren token de un usuario con perfil "administrador"
// (RolesGuard del back responde 403 si no, 401 si el usuario ya no existe o está deshabilitado).
@Service()
export class UsuariosService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/usuarios`;

  listar(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.url);
  }

  // Mismos datos que el registro; no inicia sesión con el usuario creado.
  crear(payload: RegistroPayload): Observable<Usuario> {
    return this.http.post<Usuario>(this.url, payload);
  }

  deshabilitar(id: string): Observable<Usuario> {
    return this.http.delete<Usuario>(`${this.url}/${id}`);
  }

  habilitar(id: string): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.url}/${id}/habilitar`, {});
  }
}
