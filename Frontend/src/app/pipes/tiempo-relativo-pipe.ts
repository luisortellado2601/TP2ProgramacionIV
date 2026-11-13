import { Pipe, PipeTransform } from '@angular/core';

const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

function plural(cantidad: number, singular: string, plural: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}

// Fecha como texto relativo: "hace un momento", "hace 5 min", "hace 3 h", "hace 2 días".
// Pasada una semana muestra la fecha (dd/MM/yy). `ahora` se puede pasar para probarla.
@Pipe({ name: 'tiempoRelativo' })
export class TiempoRelativoPipe implements PipeTransform {
  transform(fecha: string | Date | null | undefined, ahora: number = Date.now()): string {
    if (!fecha) {
      return '';
    }
    const instante = new Date(fecha);
    if (Number.isNaN(instante.getTime())) {
      return '';
    }

    // Si la fecha quedó apenas en el futuro (relojes desfasados), se trata como "recién".
    const diferencia = Math.max(0, ahora - instante.getTime());

    if (diferencia < MINUTO) {
      return 'hace un momento';
    }
    if (diferencia < HORA) {
      return `hace ${Math.floor(diferencia / MINUTO)} min`;
    }
    if (diferencia < DIA) {
      return `hace ${Math.floor(diferencia / HORA)} h`;
    }
    if (diferencia < 7 * DIA) {
      return `hace ${plural(Math.floor(diferencia / DIA), 'día', 'días')}`;
    }

    const dia = String(instante.getDate()).padStart(2, '0');
    const mes = String(instante.getMonth() + 1).padStart(2, '0');
    return `${dia}/${mes}/${String(instante.getFullYear()).slice(-2)}`;
  }
}
