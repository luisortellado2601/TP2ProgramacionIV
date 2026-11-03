import { Service, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ListadoComentarios } from '../models/comentario';

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
}
