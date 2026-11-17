import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Cargando } from './cargando';

const CLAVE_SESION = 'nextplay_sesion';
const CLAVE_ARRANQUE = 'nextplay_arranque_visto';

const usuario = {
  id: 'u1',
  nombre: 'Ana',
  apellido: 'Gómez',
  correo: 'ana@mail.com',
  nombreUsuario: 'ana',
  fechaNacimiento: '1999-05-20T00:00:00.000Z',
  descripcion: '',
  perfil: 'usuario',
  habilitado: true,
  fechaAlta: '2026-01-01T00:00:00.000Z',
};

describe('Cargando (pantalla de arranque)', () => {
  let backend: HttpTestingController;
  let navegar: ReturnType<typeof vi.spyOn>;

  function crear(opciones: { sesion: boolean; arranqueVisto: boolean }) {
    if (opciones.sesion) {
      localStorage.setItem(CLAVE_SESION, JSON.stringify({ usuario, token: 'a.b.c' }));
    }
    if (opciones.arranqueVisto) {
      sessionStorage.setItem(CLAVE_ARRANQUE, '1');
    }
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    backend = TestBed.inject(HttpTestingController);
    navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(Cargando);
    fixture.detectChanges();
    return { fixture, html: fixture.nativeElement as HTMLElement };
  }

  beforeEach(() => vi.useFakeTimers());

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('sin sesión y sin haberla visto, muestra la secuencia y espera el toque antes de ir al login', async () => {
    const { fixture, html } = crear({ sesion: false, arranqueVisto: false });

    expect(html.querySelector('.arranque__logo')?.getAttribute('aria-label')).toBe('NextPlay');
    expect(html.querySelector('.arranque__empezar')).toBeNull();
    expect(navegar).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(3000);
    fixture.detectChanges();

    const boton = html.querySelector('.arranque__empezar') as HTMLButtonElement;
    expect(boton.textContent).toContain('Presioná para empezar');
    expect(navegar).not.toHaveBeenCalled();

    boton.click();
    expect(navegar).toHaveBeenCalledExactlyOnceWith('/login');
    expect(sessionStorage.getItem(CLAVE_ARRANQUE)).toBe('1');
  });

  it('sin sesión muestra el lema de NextPlay; con sesión saluda al usuario por su nombre de usuario', () => {
    const sinSesion = crear({ sesion: false, arranqueVisto: false });
    expect(sinSesion.html.querySelector('.arranque__lema')?.textContent).toContain(
      'encontrá con quién jugar',
    );
    TestBed.resetTestingModule();

    const conSesion = crear({ sesion: true, arranqueVisto: false });
    expect(conSesion.html.querySelector('.arranque__lema')?.textContent).toContain(
      'Qué bueno verte, @ana.',
    );
  });

  it('un toque durante la animación la saltea y va al login', () => {
    const { html } = crear({ sesion: false, arranqueVisto: false });

    (html.querySelector('.arranque') as HTMLElement).click();

    expect(navegar).toHaveBeenCalledExactlyOnceWith('/login');
  });

  it('ya vista en la sesión, no repite la secuencia: muestra el spinner y va al login', async () => {
    const { fixture, html } = crear({ sesion: false, arranqueVisto: true });
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();

    expect(html.querySelector('.arranque')).toBeNull();
    expect(html.querySelector('app-spinner')).not.toBeNull();
    expect(navegar).toHaveBeenCalledExactlyOnceWith('/login');
  });

  it('con sesión, valida el token y entra sola a publicaciones cuando termina la animación', async () => {
    const { fixture, html } = crear({ sesion: true, arranqueVisto: false });
    backend.expectOne(`${environment.apiUrl}/auth/autorizar`).flush({ usuario });

    await vi.advanceTimersByTimeAsync(1000);
    fixture.detectChanges();
    expect(html.textContent).toContain('Validando tu sesión');
    expect(navegar).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2000);
    fixture.detectChanges();
    expect(navegar).toHaveBeenCalledExactlyOnceWith('/publicaciones');
  });

  it('con sesión y arranque ya visto, entra en cuanto se valida el token', async () => {
    const { fixture } = crear({ sesion: true, arranqueVisto: true });
    await vi.advanceTimersByTimeAsync(0);
    expect(navegar).not.toHaveBeenCalled();

    backend.expectOne(`${environment.apiUrl}/auth/autorizar`).flush({ usuario });
    fixture.detectChanges();

    expect(navegar).toHaveBeenCalledExactlyOnceWith('/publicaciones');
  });

  it('si la validación falla, vuelve al login sin esperar la animación', () => {
    crear({ sesion: true, arranqueVisto: false });

    backend
      .expectOne(`${environment.apiUrl}/auth/autorizar`)
      .flush({ message: 'caído' }, { status: 500, statusText: 'Server Error' });

    expect(navegar).toHaveBeenCalledExactlyOnceWith('/login');
  });
});
