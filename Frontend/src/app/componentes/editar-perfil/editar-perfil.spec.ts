import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth';
import { ModalService } from '../../services/modal';
import { EditarPerfil } from './editar-perfil';

const CLAVE_SESION = 'nextplay_sesion';
const URL_PERFIL = `${environment.apiUrl}/usuarios/me`;

const usuario = {
  id: 'u1',
  nombre: 'Ana',
  apellido: 'Gómez',
  correo: 'ana@mail.com',
  nombreUsuario: 'ana',
  fechaNacimiento: '1999-05-20T00:00:00.000Z', // así llega del back: medianoche UTC
  descripcion: 'Me gustan los RPG',
  perfil: 'usuario',
  habilitado: true,
  fechaAlta: '2026-01-01T00:00:00.000Z',
};

describe('EditarPerfil', () => {
  let backend: HttpTestingController;
  let modalService: ModalService;
  let router: Router;

  function crear() {
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ usuario, token: 'a.b.c' }));
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    backend = TestBed.inject(HttpTestingController);
    modalService = TestBed.inject(ModalService);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    vi.spyOn(modalService, 'exito');
    vi.spyOn(modalService, 'error');

    const fixture = TestBed.createComponent(EditarPerfil);
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;

    const campo = (id: string) => html.querySelector(`#${id}`) as HTMLInputElement;
    const escribir = (id: string, valor: string) => {
      campo(id).value = valor;
      campo(id).dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };
    const guardar = () => html.querySelector('button[type="submit"]') as HTMLButtonElement;
    const enviar = () => {
      html.querySelector('form')!.dispatchEvent(new Event('submit'));
      fixture.detectChanges();
    };
    const elegirArchivo = (archivo: File) => {
      Object.defineProperty(campo('imagenPerfil'), 'files', {
        value: [archivo],
        configurable: true,
      });
      campo('imagenPerfil').dispatchEvent(new Event('change'));
      fixture.detectChanges();
    };
    return { fixture, html, campo, escribir, guardar, enviar, elegirArchivo };
  }

  afterEach(() => {
    backend.verify();
    localStorage.clear();
  });

  it('muestra los datos actuales en el formulario, con la fecha como YYYY-MM-DD', () => {
    const { campo } = crear();

    expect(campo('nombre').value).toBe('Ana');
    expect(campo('apellido').value).toBe('Gómez');
    expect(campo('fechaNacimiento').value).toBe('1999-05-20');
    expect(campo('descripcion').value).toBe('Me gustan los RPG');
  });

  it('el correo y el nombre de usuario se ven pero no se pueden modificar', () => {
    const { campo } = crear();

    expect(campo('correo').value).toBe('ana@mail.com');
    expect(campo('correo').disabled).toBe(true);
    expect(campo('nombreUsuario').value).toBe('ana');
    expect(campo('nombreUsuario').disabled).toBe(true);
  });

  it('"Guardar" solo se habilita cuando hay algo distinto de lo guardado', () => {
    const { escribir, guardar } = crear();
    expect(guardar().disabled).toBe(true);

    escribir('nombre', 'Ana María');
    expect(guardar().disabled).toBe(false);

    escribir('nombre', 'Ana'); // vuelve al valor original
    expect(guardar().disabled).toBe(true);
  });

  it('con datos inválidos muestra los errores y no manda nada', () => {
    const { html, escribir, enviar } = crear();

    escribir('nombre', '');
    escribir('fechaNacimiento', '2999-01-01');
    enviar();

    expect(html.textContent).toContain('El nombre es obligatorio.');
    expect(html.textContent).toContain('La fecha de nacimiento no puede ser futura.');
    backend.expectNone(URL_PERFIL);
  });

  it('guarda: manda solo los datos editables, actualiza la sesión, avisa y vuelve a Mi perfil', () => {
    const { escribir, enviar } = crear();
    const auth = TestBed.inject(AuthService);

    escribir('nombre', '  Ana María  ');
    escribir('descripcion', 'Nueva descripción');
    enviar();

    const pedido = backend.expectOne(URL_PERFIL);
    expect(pedido.request.method).toBe('PUT');
    // Sin correo, nombre de usuario, contraseña ni perfil: no se pueden cambiar.
    expect(pedido.request.body).toEqual({
      nombre: 'Ana María',
      apellido: 'Gómez',
      fechaNacimiento: '1999-05-20',
      descripcion: 'Nueva descripción',
    });
    pedido.flush({ ...usuario, nombre: 'Ana María', descripcion: 'Nueva descripción' });

    expect(auth.usuarioActual()?.nombre).toBe('Ana María');
    const guardada = JSON.parse(localStorage.getItem(CLAVE_SESION)!);
    expect(guardada.usuario.nombre).toBe('Ana María');
    expect(guardada.token).toBe('a.b.c'); // el token no cambia
    expect(modalService.exito).toHaveBeenCalledWith('Tu perfil se actualizó correctamente.');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/perfil');
  });

  it('si el back rechaza el cambio muestra su mensaje en un modal y no toca la sesión', () => {
    const { escribir, enviar, guardar, fixture } = crear();
    const auth = TestBed.inject(AuthService);

    escribir('nombre', 'Ana María');
    enviar();
    backend
      .expectOne(URL_PERFIL)
      .flush(
        { message: ['La fecha de nacimiento no es válida'] },
        { status: 400, statusText: 'Bad Request' },
      );
    fixture.detectChanges();

    expect(modalService.error).toHaveBeenCalledWith('La fecha de nacimiento no es válida');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(auth.usuarioActual()?.nombre).toBe('Ana');
    expect(guardar().disabled).toBe(false); // se puede reintentar
  });

  it('rechaza una foto que no sea JPG, PNG o WEBP', () => {
    const { html, elegirArchivo, guardar } = crear();

    elegirArchivo(new File(['x'], 'foto.gif', { type: 'image/gif' }));

    expect(html.textContent).toContain('La imagen debe ser JPG, PNG o WEBP.');
    expect(guardar().disabled).toBe(true);
  });

  it('rechaza una foto de más de 2 MB', () => {
    const { html, elegirArchivo } = crear();
    const grande = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'foto.png', {
      type: 'image/png',
    });

    elegirArchivo(grande);

    expect(html.textContent).toContain('La imagen no puede superar los 2 MB.');
  });

  it('con una foto nueva muestra la vista previa y la manda como data URL', async () => {
    const { fixture, html, elegirArchivo, guardar, enviar } = crear();

    elegirArchivo(new File(['contenido'], 'foto.png', { type: 'image/png' }));
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(html.querySelector('img.editar-perfil__avatar')).not.toBeNull();
    });
    expect(guardar().disabled).toBe(false); // solo cambió la foto y alcanza para guardar

    enviar();
    const pedido = backend.expectOne(URL_PERFIL);
    expect(pedido.request.body.imagenPerfil).toMatch(/^data:image\/png;base64,/);
    pedido.flush({ ...usuario, imagenPerfilUrl: 'https://storage/perfiles/nueva.png' });

    expect(TestBed.inject(AuthService).usuarioActual()?.imagenPerfilUrl).toBe(
      'https://storage/perfiles/nueva.png',
    );
  });

  it('"Cancelar" vuelve a Mi perfil sin guardar', () => {
    const { html } = crear();
    const cancelar = Array.from(html.querySelectorAll('a')).find((a) =>
      a.textContent?.includes('Cancelar'),
    );

    expect(cancelar?.getAttribute('href')).toBe('/perfil');
    backend.expectNone(URL_PERFIL);
  });
});
