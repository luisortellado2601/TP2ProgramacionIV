import { Service, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ComentariosPorPublicacion,
  PublicacionesPorUsuario,
  RangoFechas,
  RespuestaComentarios,
} from '../models/estadisticas';

// Rutas de administrador (el back responde 403 si el perfil no corresponde).
// `desde` y `hasta` son opcionales: sin ellos no se acota ese extremo del lapso.
@Service()
export class EstadisticasService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/estadisticas`;

  publicacionesPorUsuario(rango: RangoFechas): Observable<PublicacionesPorUsuario[]> {
    return this.http.get<PublicacionesPorUsuario[]>(`${this.url}/publicaciones-por-usuario`, {
      params: this.parametros(rango),
    });
  }

  comentarios(rango: RangoFechas): Observable<RespuestaComentarios> {
    return this.http.get<RespuestaComentarios>(`${this.url}/comentarios`, {
      params: this.parametros(rango),
    });
  }

  comentariosPorPublicacion(rango: RangoFechas): Observable<ComentariosPorPublicacion[]> {
    return this.http.get<ComentariosPorPublicacion[]>(`${this.url}/comentarios-por-publicacion`, {
      params: this.parametros(rango),
    });
  }

  private parametros(rango: RangoFechas): HttpParams {
    let params = new HttpParams();
    if (rango.desde) {
      params = params.set('desde', rango.desde);
    }
    if (rango.hasta) {
      params = params.set('hasta', rango.hasta);
    }
    return params;
  }
}
