import { Service } from '@angular/core';
import { JUEGOS } from '../data/juegos';
import { Juego } from '../models/juego';

const BASE_STEAM = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps';

@Service()
export class JuegosService {
  listar(): readonly Juego[] {
    return JUEGOS;
  }

  obtener(id: string): Juego | undefined {
    return JUEGOS.find((juego) => juego.id === id);
  }

  portada(juego: Juego): string {
    if (juego.portada) {
      return juego.portada;
    }
    return `${BASE_STEAM}/${juego.steamAppId}/library_600x900.jpg`;
  }
}
