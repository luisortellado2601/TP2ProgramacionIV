import { Pipe, PipeTransform } from '@angular/core';

// Primera letra de nombre y apellido, en mayúscula, para el avatar por defecto.
@Pipe({ name: 'iniciales' })
export class InicialesPipe implements PipeTransform {
  transform(nombre: string, apellido: string): string {
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
  }
}
