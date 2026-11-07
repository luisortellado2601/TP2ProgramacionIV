import { Service, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CrearPublicacionPayload,
  FiltrosPublicaciones,
  ListadoPublicaciones,
  Publicacion,
  RespuestaLikes,
} from '../models/publicacion';

@Service()
export class PublicacionesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/publicaciones`;

  listar(filtros: FiltrosPublicaciones): Observable<ListadoPublicaciones> {
    let params = new HttpParams()
      .set('orden', filtros.orden)
      .set('offset', filtros.offset)
      .set('limit', filtros.limit);
    if (filtros.usuario) {
      params = params.set('usuario', filtros.usuario);
    }
    return this.http.get<ListadoPublicaciones>(this.url, { params });
  }

  crear(payload: CrearPublicacionPayload): Observable<Publicacion> {
    return this.http.post<Publicacion>(this.url, payload);
  }

  // Quién actúa lo identifica el back con el token que agrega el interceptor.
  eliminar(id: string): Observable<{ id: string; eliminada: boolean }> {
    return this.http.delete<{ id: string; eliminada: boolean }>(`${this.url}/${id}`);
  }

  darLike(id: string): Observable<RespuestaLikes> {
    return this.http.post<RespuestaLikes>(`${this.url}/${id}/like`, {});
  }

  quitarLike(id: string): Observable<RespuestaLikes> {
    return this.http.delete<RespuestaLikes>(`${this.url}/${id}/like`);
  }
}
