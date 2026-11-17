import { Service, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Busqueda,
  CrearBusquedaPayload,
  FiltrosBusquedas,
  ListadoBusquedas,
  RespuestaBusqueda,
} from '../models/busqueda';

@Service()
export class BusquedasService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/busquedas`;

  listar(filtros: FiltrosBusquedas): Observable<ListadoBusquedas> {
    let params = new HttpParams().set('offset', filtros.offset).set('limit', filtros.limit);
    for (const clave of ['juego', 'region', 'plataforma'] as const) {
      const valor = filtros[clave];
      if (valor) {
        params = params.set(clave, valor);
      }
    }
    return this.http.get<ListadoBusquedas>(this.url, { params });
  }

  crear(payload: CrearBusquedaPayload): Observable<Busqueda> {
    return this.http.post<Busqueda>(this.url, payload);
  }

  responder(id: string, mensaje: string): Observable<RespuestaBusqueda> {
    return this.http.post<RespuestaBusqueda>(`${this.url}/${id}/respuestas`, { mensaje });
  }

  cerrar(id: string): Observable<{ id: string; cerrada: boolean }> {
    return this.http.delete<{ id: string; cerrada: boolean }>(`${this.url}/${id}`);
  }
}
