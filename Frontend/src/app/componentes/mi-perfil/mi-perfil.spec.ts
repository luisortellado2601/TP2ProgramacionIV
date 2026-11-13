import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { MiPerfil } from './mi-perfil';

const CLAVE_SESION = 'nextplay_sesion';

const usuario = {
  id: 'u1',
  nombre: 'Ana',
  apellido: 'Gómez',
  correo: 'ana@mail.com',
  nombreUsuario: 'ana',
  // Así llega del back: medianoche UTC del día de nacimiento.
  fechaNacimiento: '1999-05-20T00:00:00.000Z',
  descripcion: 'Me gustan los RPG',
  perfil: 'usuario',
  habilitado: true,
  fechaAlta: '2026-01-01T00:00:00.000Z',
};

describe('MiPerfil', () => {
  let backend: HttpTestingController;

  function crear() {
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ usuario, token: 'a.b.c' }));
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    backend = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(MiPerfil);
    fixture.detectChanges();
    return { fixture, html: fixture.nativeElement as HTMLElement };
  }

  afterEach(() => {
    localStorage.clear();
  });

  it('muestra todos los datos del usuario, incluida la fecha de nacimiento', () => {
    const { fixture, html } = crear();
    backend
      .expectOne((r) => r.url === `${environment.apiUrl}/publicaciones`)
      .flush({ total: 0, publicaciones: [] });
    fixture.detectChanges();

    const texto = html.textContent ?? '';
    expect(texto).toContain('Ana Gómez');
    expect(texto).toContain('@ana');
    expect(texto).toContain('ana@mail.com');
    expect(texto).toContain('Me gustan los RPG');
    expect(texto).toContain('Nacimiento: 20/05/1999');
  });

  it('la fecha de nacimiento no retrocede un día (se muestra en UTC, sin importar la zona horaria)', () => {
    const { fixture, html } = crear();
    backend
      .expectOne((r) => r.url === `${environment.apiUrl}/publicaciones`)
      .flush({ total: 0, publicaciones: [] });
    fixture.detectChanges();

    expect(html.textContent).not.toContain('19/05/1999');
  });

  it('tiene un botón Editar perfil que lleva al formulario de edición', () => {
    const { fixture, html } = crear();
    backend
      .expectOne((r) => r.url === `${environment.apiUrl}/publicaciones`)
      .flush({ total: 0, publicaciones: [] });
    fixture.detectChanges();

    const enlace = html.querySelector('a.perfil__editar');
    expect(enlace?.textContent?.trim()).toBe('Editar perfil');
    expect(enlace?.getAttribute('href')).toBe('/perfil/editar');
  });

  it('mientras carga las publicaciones muestra el spinner', () => {
    const { html } = crear();

    expect(html.querySelector('app-spinner .spinner')).not.toBeNull();
    backend
      .expectOne((r) => r.url === `${environment.apiUrl}/publicaciones`)
      .flush({
        total: 0,
        publicaciones: [],
      });
  });
});
