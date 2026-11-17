import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Login } from './login';

const CLAVE_ARRANQUE = 'nextplay_arranque_visto';

function token(): string {
  const iat = Math.floor(Date.now() / 1000);
  return `cabecera.${btoa(JSON.stringify({ sub: 'u1', iat, exp: iat + 3600 }))}.firma`;
}

describe('Login', () => {
  let backend: HttpTestingController;
  let navegar: ReturnType<typeof vi.spyOn>;

  function crear() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    backend = TestBed.inject(HttpTestingController);
    navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    return { fixture, html: fixture.nativeElement as HTMLElement };
  }

  function completar(html: HTMLElement, id: string, valor: string) {
    const campo = html.querySelector(`#${id}`) as HTMLInputElement;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
  }

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('al iniciar sesión vuelve a mostrar la secuencia de arranque y pasa por "/"', () => {
    sessionStorage.setItem(CLAVE_ARRANQUE, '1');
    const { fixture, html } = crear();
    completar(html, 'usuarioOCorreo', 'ana');
    completar(html, 'contrasena', 'Clave1234');

    (html.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    backend
      .expectOne(`${environment.apiUrl}/auth/login`)
      .flush({ usuario: { id: 'u1', nombre: 'Ana', nombreUsuario: 'ana' }, token: token() });

    expect(sessionStorage.getItem(CLAVE_ARRANQUE)).toBeNull();
    expect(navegar).toHaveBeenCalledExactlyOnceWith('/');
  });

  it('si las credenciales fallan, no navega ni reinicia la secuencia', () => {
    sessionStorage.setItem(CLAVE_ARRANQUE, '1');
    const { fixture, html } = crear();
    completar(html, 'usuarioOCorreo', 'ana');
    completar(html, 'contrasena', 'Clave1234');

    (html.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    backend
      .expectOne(`${environment.apiUrl}/auth/login`)
      .flush({ message: 'Credenciales inválidas' }, { status: 401, statusText: 'Unauthorized' });

    expect(sessionStorage.getItem(CLAVE_ARRANQUE)).toBe('1');
    expect(navegar).not.toHaveBeenCalled();
  });
});
