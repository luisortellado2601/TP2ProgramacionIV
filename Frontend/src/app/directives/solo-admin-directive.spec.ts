import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../services/auth';
import { PerfilUsuario, Usuario } from '../models/usuario';
import { SoloAdminDirective } from './solo-admin-directive';

@Component({
  imports: [SoloAdminDirective],
  template: `<a *appSoloAdmin class="enlace-admin">Usuarios</a>`,
})
class Anfitrion {}

describe('SoloAdminDirective', () => {
  const usuario = signal<Usuario | null>(null);

  function crear() {
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { usuarioActual: usuario } }],
    });
    return TestBed.createComponent(Anfitrion);
  }

  const hayEnlace = (el: HTMLElement) => el.querySelector('.enlace-admin') !== null;
  const conPerfil = (perfil: PerfilUsuario) => ({ id: 'u1', perfil }) as Usuario;

  beforeEach(() => usuario.set(null));

  it('no dibuja el elemento sin sesión ni para un usuario común', async () => {
    const fixture = crear();
    await fixture.whenStable();
    expect(hayEnlace(fixture.nativeElement)).toBe(false);

    usuario.set(conPerfil(PerfilUsuario.USUARIO));
    await fixture.whenStable();
    expect(hayEnlace(fixture.nativeElement)).toBe(false);
  });

  it('lo dibuja para un administrador y lo saca si la sesión cambia', async () => {
    usuario.set(conPerfil(PerfilUsuario.ADMINISTRADOR));
    const fixture = crear();
    await fixture.whenStable();
    expect(hayEnlace(fixture.nativeElement)).toBe(true);

    usuario.set(null);
    await fixture.whenStable();
    expect(hayEnlace(fixture.nativeElement)).toBe(false);
  });
});
