import { Directive, input } from '@angular/core';
import { PerfilUsuario } from '../models/usuario';

// Directiva de atributo para la pastilla del perfil: `<span [appPastillaPerfil]="usuario.perfil">`
// le agrega la clase `pastilla-perfil--administrador` o `pastilla-perfil--usuario` según el perfil,
// y se actualiza sola si el perfil cambia. Solo pone la clase: los colores los define el CSS del
// componente que la usa (admin-usuarios.css), junto al resto de las pastillas.
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
