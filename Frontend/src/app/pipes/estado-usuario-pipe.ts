import { Pipe, PipeTransform } from '@angular/core';

// Clase para pintar en verde a un usuario habilitado y en rojo a uno deshabilitado.
@Pipe({ name: 'estadoUsuario' })
export class EstadoUsuarioPipe implements PipeTransform {
  transform(habilitado: boolean): string {
    return habilitado ? 'usuario__pill--habilitado' : 'usuario__pill--deshabilitado';
  }
}
