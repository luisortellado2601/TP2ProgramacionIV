import { Service, signal } from '@angular/core';

export type Tema = 'oscuro' | 'claro';

const CLAVE_TEMA = 'nextplay_tema';
const COLOR_BARRA: Record<Tema, string> = { oscuro: '#0e1019', claro: '#ffffff' };

@Service()
export class TemaService {
  readonly tema = signal<Tema>(this.temaInicial());

  constructor() {
    this.aplicar(this.tema());
  }

  alternar(): void {
    this.elegir(this.tema() === 'oscuro' ? 'claro' : 'oscuro');
  }

  elegir(tema: Tema): void {
    this.aplicar(tema);
    this.tema.set(tema);
    try {
      localStorage.setItem(CLAVE_TEMA, tema);
    } catch {}
  }

  private temaInicial(): Tema {
    try {
      const guardado = localStorage.getItem(CLAVE_TEMA);
      if (guardado === 'claro' || guardado === 'oscuro') {
        return guardado;
      }
    } catch {}
    const prefiereClaro = window.matchMedia?.('(prefers-color-scheme: light)').matches ?? false;
    return prefiereClaro ? 'claro' : 'oscuro';
  }

  private aplicar(tema: Tema): void {
    document.documentElement.setAttribute('data-tema', tema);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLOR_BARRA[tema]);
  }
}
