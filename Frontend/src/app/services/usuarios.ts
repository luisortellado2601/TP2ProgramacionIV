import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { RegistroPayload, Usuario } from '../models/usuario';

@Service()
export class UsuariosService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/usuarios`;

  listar(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.url);
  }

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
