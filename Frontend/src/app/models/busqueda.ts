import { AutorPublicacion } from './publicacion';

export const PLATAFORMAS = ['PC', 'PlayStation', 'Xbox', 'Nintendo Switch', 'Móvil'] as const;
export const REGIONES = ['Sudamérica', 'Norteamérica', 'Europa', 'Asia', 'Oceanía'] as const;

export interface RespuestaBusqueda {
  id: string;
  mensaje: string;
  fecha: string;
  autor: AutorPublicacion;
}

export interface Busqueda {
  id: string;
  juego: string;
  region: string;
  plataforma: string;
  descripcion?: string;
  fecha: string;
  autor: AutorPublicacion;
  respuestas: RespuestaBusqueda[];
}

export interface ListadoBusquedas {
  total: number;
  busquedas: Busqueda[];
}

export interface FiltrosBusquedas {
  juego?: string;
  region?: string;
  plataforma?: string;
  offset: number;
  limit: number;
}

export interface CrearBusquedaPayload {
  juego: string;
  region: string;
  plataforma: string;
  descripcion?: string;
}
