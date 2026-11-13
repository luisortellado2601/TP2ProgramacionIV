export type OrdenPublicaciones = 'fecha' | 'likes';

export interface AutorPublicacion {
  id: string;
  nombre: string;
  apellido: string;
  nombreUsuario: string;
  imagenPerfilUrl?: string;
}

export interface Publicacion {
  id: string;
  titulo: string;
  mensaje: string;
  imagenUrl?: string;
  fecha: string;
  likes: string[];
  cantidadLikes: number;
  cantidadComentarios: number;
  autor: AutorPublicacion;
}

export interface ListadoPublicaciones {
  total: number;
  publicaciones: Publicacion[];
}

export interface RespuestaLikes {
  id: string;
  likes: string[];
  cantidadLikes: number;
}

export interface FiltrosPublicaciones {
  orden: OrdenPublicaciones;
  offset: number;
  limit: number;
  usuario?: string;
}

export interface CrearPublicacionPayload {
  titulo: string;
  mensaje: string;
  imagen?: string; // data URL en base64
}
