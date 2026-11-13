// Lapso elegible: fechas "YYYY-MM-DD" (con solo la fecha, el back incluye el día entero en `hasta`).
export interface RangoFechas {
  desde?: string;
  hasta?: string;
}

export interface PublicacionesPorUsuario {
  usuarioId: string;
  nombreUsuario: string;
  cantidad: number;
}

export interface ComentariosPorDia {
  fecha: string;
  cantidad: number;
}

export interface RespuestaComentarios {
  total: number;
  porDia: ComentariosPorDia[];
}

export interface ComentariosPorPublicacion {
  publicacionId: string;
  titulo: string;
  cantidad: number;
}
