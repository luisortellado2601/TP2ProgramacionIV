import { AutorPublicacion } from './publicacion';

export interface Comentario {
  id: string;
  publicacionId: string;
  mensaje: string;
  fecha: string;
  modificado: boolean;
  autor: AutorPublicacion;
}

export interface ListadoComentarios {
  total: number;
  comentarios: Comentario[];
}
