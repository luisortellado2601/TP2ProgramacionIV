import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PerfilUsuario } from '../models/usuario';
import { PastillaPerfilDirective } from './pastilla-perfil-directive';

@Component({
  imports: [PastillaPerfilDirective],
  template: `<span class="pastilla" [appPastillaPerfil]="perfil()">{{ perfil() }}</span>`,
})
class Anfitrion {
  perfil = signal<PerfilUsuario>(PerfilUsuario.USUARIO);
}

describe('PastillaPerfilDirective', () => {
  function crear() {
    const fixture = TestBed.createComponent(Anfitrion);
    fixture.detectChanges();
    const pastilla = () => fixture.nativeElement.querySelector('.pastilla') as HTMLElement;
    return { fixture, pastilla };
  }

  it('un usuario común lleva la clase de usuario', () => {
    const { pastilla } = crear();
    expect(pastilla().classList.contains('pastilla-perfil--usuario')).toBe(true);
    expect(pastilla().classList.contains('pastilla-perfil--administrador')).toBe(false);
  });

  it('un administrador lleva la clase de administrador', () => {
    const { fixture, pastilla } = crear();
    fixture.componentInstance.perfil.set(PerfilUsuario.ADMINISTRADOR);
    fixture.detectChanges();
    expect(pastilla().classList.contains('pastilla-perfil--administrador')).toBe(true);
    expect(pastilla().classList.contains('pastilla-perfil--usuario')).toBe(false);
  });

  it('cambia la clase si el perfil cambia', () => {
    const { fixture, pastilla } = crear();
    fixture.componentInstance.perfil.set(PerfilUsuario.ADMINISTRADOR);
    fixture.detectChanges();
    fixture.componentInstance.perfil.set(PerfilUsuario.USUARIO);
    fixture.detectChanges();
    expect(pastilla().classList.contains('pastilla-perfil--usuario')).toBe(true);
    expect(pastilla().classList.contains('pastilla-perfil--administrador')).toBe(false);
  });
});
