export interface Juego {
  id: string;
  titulo: string;
  desarrollador: string;
  lanzamiento: number;
  generos: string[];
  plataformas: string[];
  peso: string;
  sinopsis: string;
  steamAppId?: number;
  portada?: string;
  capturas: string[];
}
