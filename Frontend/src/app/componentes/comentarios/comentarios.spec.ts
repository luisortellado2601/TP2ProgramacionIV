import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { Comentario } from '../../models/comentario';
import { Comentarios } from './comentarios';

const CLAVE_SESION = 'nextplay_sesion';
const URL_COMENTARIOS = `${environment.apiUrl}/publicaciones/p1/comentarios`;

function comentario(id: string, autorId: string, mensaje: string, modificado = false): Comentario {
  return {
    id,
    publicacionId: 'p1',
    mensaje,
    fecha: '2026-11-10T12:00:00.000Z',
    modificado,
    autor: { id: autorId, nombre: 'Ana', apellido: 'Pérez', nombreUsuario: `user-${autorId}` },
  };
}

describe('Comentarios', () => {
  let fixture: ComponentFixture<Comentarios>;
  let backend: HttpTestingController;

  // Inicia el componente con la sesión de "u1" y responde la primera carga (2 de 3 comentarios).
  function crear(interactivo: boolean): void {
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ usuario: { id: 'u1' }, token: 'x' }));
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Comentarios);
    fixture.componentRef.setInput('publicacionId', 'p1');
    fixture.componentRef.setInput('limite', 2);
    fixture.componentRef.setInput('interactivo', interactivo);
    fixture.detectChanges();

    backend
      .expectOne(`${URL_COMENTARIOS}?offset=0&limit=2`)
      .flush({
        total: 3,
        comentarios: [comentario('c1', 'u1', 'Mío'), comentario('c2', 'u2', 'De otro')],
      });
    fixture.detectChanges();
  }

  const pantalla = () => fixture.nativeElement as HTMLElement;
  const textos = () =>
    Array.from(pantalla().querySelectorAll('.comentario__mensaje')).map((p) => p.textContent);

  function escribir(selector: string, valor: string): void {
    const campo = pantalla().querySelector<HTMLTextAreaElement>(selector)!;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
  }

  afterEach(() => {
    backend.verify();
    localStorage.clear();
  });

  it('"cargar más" suma los siguientes sin quitar los anteriores', () => {
    crear(true);
    expect(textos()).toEqual(['Mío', 'De otro']);

    pantalla().querySelector<HTMLButtonElement>('.comentarios__cargar-mas')!.click();
    backend
      .expectOne(`${URL_COMENTARIOS}?offset=2&limit=2`)
      .flush({ total: 3, comentarios: [comentario('c3', 'u2', 'El más viejo')] });
    fixture.detectChanges();

    expect(textos()).toEqual(['Mío', 'De otro', 'El más viejo']);
    expect(pantalla().querySelector('.comentarios__cargar-mas')).toBeNull();
  });

  it('comenta con el mensaje recortado y lo muestra arriba', () => {
    crear(true);
    escribir('#nuevo-comentario', '  Hola  ');
    pantalla().querySelector<HTMLFormElement>('.comentarios__nuevo')!.requestSubmit();

    const peticion = backend.expectOne(URL_COMENTARIOS);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({ mensaje: 'Hola' });
    peticion.flush(comentario('c9', 'u1', 'Hola'));
    fixture.detectChanges();

    expect(textos()).toEqual(['Hola', 'Mío', 'De otro']);
    expect(pantalla().querySelector('h4')!.textContent).toContain('(4)');
  });

  it('no envía un comentario vacío', () => {
    crear(true);
    escribir('#nuevo-comentario', '   ');
    pantalla().querySelector<HTMLFormElement>('.comentarios__nuevo')!.requestSubmit();
    fixture.detectChanges();

    backend.expectNone(URL_COMENTARIOS);
    expect(pantalla().textContent).toContain('no puede estar vacío');
  });

  it('solo permite editar los propios y anuncia que fue editado', () => {
    crear(true);
    const botones = pantalla().querySelectorAll<HTMLButtonElement>('.comentario__editar');
    expect(botones.length).toBe(1); // solo el comentario de u1

    botones[0].click();
    fixture.detectChanges();
    escribir('.comentario__edicion textarea', 'Mío, corregido');
    pantalla().querySelector<HTMLFormElement>('.comentario__edicion')!.requestSubmit();

    const peticion = backend.expectOne(`${environment.apiUrl}/comentarios/c1`);
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toEqual({ mensaje: 'Mío, corregido' });
    peticion.flush(comentario('c1', 'u1', 'Mío, corregido', true));
    fixture.detectChanges();

    expect(textos()).toEqual(['Mío, corregido', 'De otro']);
    expect(pantalla().textContent).toContain('editado');
    expect(pantalla().querySelector('.comentario__edicion')).toBeNull();
  });

  it('si no cambió el texto, cierra la edición sin llamar al back', () => {
    crear(true);
    pantalla().querySelector<HTMLButtonElement>('.comentario__editar')!.click();
    fixture.detectChanges();
    pantalla().querySelector<HTMLFormElement>('.comentario__edicion')!.requestSubmit();
    fixture.detectChanges();

    backend.expectNone(`${environment.apiUrl}/comentarios/c1`);
    expect(pantalla().querySelector('.comentario__edicion')).toBeNull();
  });

  it('en modo solo lectura no muestra caja ni edición, pero permite ver los comentarios ocultos', () => {
    crear(false);

    expect(pantalla().querySelector('.comentarios__nuevo')).toBeNull();
    expect(pantalla().querySelector('.comentario__editar')).toBeNull();

    const boton = pantalla().querySelector<HTMLButtonElement>('.comentarios__cargar-mas')!;
    expect(boton.textContent).toContain('Ver 1 comentario más');

    boton.click();
    backend
      .expectOne(`${URL_COMENTARIOS}?offset=2&limit=2`)
      .flush({ total: 3, comentarios: [comentario('c3', 'u2', 'El más viejo')] });
    fixture.detectChanges();

    expect(textos()).toEqual(['Mío', 'De otro', 'El más viejo']);
    expect(pantalla().querySelector('.comentarios__cargar-mas')).toBeNull();
    expect(pantalla().querySelector('.comentario__editar')).toBeNull();
  });
});
