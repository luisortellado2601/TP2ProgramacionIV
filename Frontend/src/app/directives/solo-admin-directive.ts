import { Directive, EmbeddedViewRef, TemplateRef, ViewContainerRef, effect, inject } from '@angular/core';
import { AuthService } from '../services/auth';
import { PerfilUsuario } from '../models/usuario';

@Directive({ selector: '[appSoloAdmin]' })
export class SoloAdminDirective {
  private readonly authService = inject(AuthService);
  private readonly plantilla = inject(TemplateRef<unknown>);
  private readonly contenedor = inject(ViewContainerRef);
  private vista: EmbeddedViewRef<unknown> | null = null;

  constructor() {
    effect(() => {
      const esAdmin = this.authService.usuarioActual()?.perfil === PerfilUsuario.ADMINISTRADOR;
      if (esAdmin && !this.vista) {
        this.vista = this.contenedor.createEmbeddedView(this.plantilla);
      } else if (!esAdmin && this.vista) {
        this.contenedor.clear();
        this.vista = null;
      }
    });
  }
}
