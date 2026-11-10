import { Service, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Comentario, ListadoComentarios } from '../models/comentario';

@Service()
export class ComentariosService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/publicaciones`;

  listar(publicacionId: string, offset: number, limit: number): Observable<ListadoComentarios> {
    const params = new HttpParams().set('offset', offset).set('limit', limit);
    return this.http.get<ListadoComentarios>(`${this.url}/${publicacionId}/comentarios`, {
      params,
    });
  }

  // El autor lo identifica el back con el token que agrega el interceptor.
  crear(publicacionId: string, mensaje: string): Observable<Comentario> {
    return this.http.post<Comentario>(`${this.url}/${publicacionId}/comentarios`, { mensaje });
  }

  // Solo el autor puede editar; el back marca el comentario como `modificado`.
  editar(comentarioId: string, mensaje: string): Observable<Comentario> {
    return this.http.put<Comentario>(`${environment.apiUrl}/comentarios/${comentarioId}`, {
      mensaje,
    });
  }
}
