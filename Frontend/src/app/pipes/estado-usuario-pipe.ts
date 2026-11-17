import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'estadoUsuario' })
export class EstadoUsuarioPipe implements PipeTransform {
  transform(habilitado: boolean): string {
    return habilitado ? 'usuario__pill--habilitado' : 'usuario__pill--deshabilitado';
  }
}
