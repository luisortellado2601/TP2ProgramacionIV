import { Directive, input } from '@angular/core';
import { PerfilUsuario } from '../models/usuario';

@Directive({
  selector: '[appPastillaPerfil]',
  host: {
    '[class.pastilla-perfil--administrador]': 'esAdministrador()',
    '[class.pastilla-perfil--usuario]': '!esAdministrador()',
  },
})
export class PastillaPerfilDirective {
  readonly perfil = input.required<PerfilUsuario | string>({ alias: 'appPastillaPerfil' });

  protected esAdministrador(): boolean {
    return this.perfil() === PerfilUsuario.ADMINISTRADOR;
  }
}
