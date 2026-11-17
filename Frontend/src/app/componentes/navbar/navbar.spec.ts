import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { ModalService } from '../../services/modal';
import { Navbar } from './navbar';

const CLAVE_SESION = 'nextplay_sesion';

function usuario(perfil: string) {
  return {
    id: 'u1',
    nombre: 'Ana',
    apellido: 'Gómez',
    correo: 'ana@mail.com',
    nombreUsuario: 'ana',
    fechaNacimiento: '1999-05-20T00:00:00.000Z',
    descripcion: '',
    perfil,
    habilitado: true,
    fechaAlta: '2026-01-01T00:00:00.000Z',
  };
}

describe('Navbar', () => {
  function crear(sesion?: { perfil: string }) {
    if (sesion) {
      localStorage.setItem(
        CLAVE_SESION,
        JSON.stringify({ usuario: usuario(sesion.perfil), token: 'a.b.c' }),
      );
    }
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideRouter([])] });
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();
    return { fixture, html: fixture.nativeElement as HTMLElement };
  }

  function enlaces(html: HTMLElement): string[] {
    return Array.from(html.querySelectorAll('.topbar__nav a')).map((a) => a.textContent!.trim());
  }

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-tema');
  });

  it('muestra la marca con su logo', () => {
    const { html } = crear();

    expect(html.querySelector('.marca')?.textContent).toContain('NextPlay');
    expect(html.querySelector('.marca svg.marca__logo')).not.toBeNull();
  });

  it('sin sesión ofrece ingresar y crear cuenta', () => {
    const { html } = crear();

    expect(enlaces(html)).toEqual(['Ingresar', 'Crear cuenta']);
    expect(html.querySelector('.topbar__salir')).toBeNull();
  });

  it('con sesión de usuario muestra la navegación sin las opciones de administrador', () => {
    const { html } = crear({ perfil: 'usuario' });

    expect(enlaces(html)).toEqual(['Publicaciones', 'Mi perfil']);
    expect(html.querySelector('.topbar__usuario')?.textContent).toContain('@ana');
  });

  it('con sesión de administrador suma Usuarios y Estadísticas', () => {
    const { html } = crear({ perfil: 'administrador' });

    expect(enlaces(html)).toEqual(['Publicaciones', 'Mi perfil', 'Usuarios', 'Estadísticas']);
  });

  it('el botón de tema cambia entre claro y oscuro y avisa a qué modo pasa', () => {
    const { fixture, html } = crear();
    const boton = () => html.querySelector('.topbar__tema') as HTMLButtonElement;
    expect(boton().getAttribute('aria-label')).toBe('Cambiar a modo claro');

    boton().click();
    fixture.detectChanges();

    expect(document.documentElement.getAttribute('data-tema')).toBe('claro');
    expect(boton().getAttribute('aria-label')).toBe('Cambiar a modo oscuro');

    boton().click();
    fixture.detectChanges();

    expect(document.documentElement.getAttribute('data-tema')).toBe('oscuro');
  });

  it('"Salir" pide confirmación antes de cerrar la sesión', () => {
    const { html } = crear({ perfil: 'usuario' });

    (html.querySelector('.topbar__salir') as HTMLButtonElement).click();

    expect(TestBed.inject(ModalService).estado()?.mensaje).toContain('cerrar tu sesión');
  });

  it('el cajón del celular se abre y se cierra', () => {
    const { fixture, html } = crear({ perfil: 'usuario' });
    const cajon = html.querySelector('.cajon') as HTMLElement;
    expect(cajon.classList.contains('cajon--abierto')).toBe(false);

    (html.querySelector('.topbar__menu') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(cajon.classList.contains('cajon--abierto')).toBe(true);

    (html.querySelector('.cajon__cerrar') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(cajon.classList.contains('cajon--abierto')).toBe(false);
  });
});
