import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { Publicacion } from '../../models/publicacion';
import { PublicacionCard } from './publicacion';

const CLAVE_SESION = 'nextplay_sesion';

const usuario = {
  id: 'u1',
  nombre: 'Ana',
  apellido: 'Gómez',
  correo: 'ana@mail.com',
  nombreUsuario: 'ana',
  fechaNacimiento: '1999-05-20T00:00:00.000Z',
  perfil: 'usuario',
  habilitado: true,
  fechaAlta: '2026-01-01T00:00:00.000Z',
};

function publicacion(likes: string[]): Publicacion {
  return {
    id: 'p1',
    titulo: 'Reseña de Elden Ring',
    mensaje: 'Muy bueno.',
    fecha: new Date().toISOString(),
    likes,
    cantidadLikes: likes.length,
    cantidadComentarios: 0,
    autor: { id: 'u2', nombre: 'Beto', apellido: 'Ruiz', nombreUsuario: 'beto' },
  };
}

describe('PublicacionCard: reacción', () => {
  function crear(likes: string[]) {
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ usuario, token: 'a.b.c' }));
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideRouter([])] });
    const fixture = TestBed.createComponent(PublicacionCard);
    fixture.componentRef.setInput('publicacion', publicacion(likes));
    const emitido = vi.fn();
    fixture.componentInstance.alternarLike.subscribe(emitido);
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;
    return { fixture, html, emitido, corazon: html.querySelector('button.corazon') as HTMLElement };
  }

  beforeEach(() => vi.useFakeTimers());

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('al dar me gusta, avisa y lanza la ráfaga de los cuatro símbolos', async () => {
    const { fixture, html, emitido, corazon } = crear([]);

    corazon.click();
    await vi.advanceTimersByTimeAsync(10);
    fixture.detectChanges();

    expect(emitido).toHaveBeenCalledOnce();
    expect(html.querySelectorAll('.rafaga .rafaga__simbolo').length).toBe(4);
    expect(html.querySelector('.rafaga')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('la ráfaga desaparece sola a los pocos instantes', async () => {
    const { fixture, html, corazon } = crear([]);

    corazon.click();
    await vi.advanceTimersByTimeAsync(10);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(1000);
    fixture.detectChanges();

    expect(html.querySelector('.rafaga')).toBeNull();
  });

  it('al quitar el me gusta avisa pero no lanza la ráfaga', async () => {
    const { fixture, html, emitido, corazon } = crear(['u1']);

    corazon.click();
    await vi.advanceTimersByTimeAsync(10);
    fixture.detectChanges();

    expect(emitido).toHaveBeenCalledOnce();
    expect(html.querySelector('.rafaga')).toBeNull();
  });
});
