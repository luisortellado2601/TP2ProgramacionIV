import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { ModalService } from '../../services/modal';
import { Grafico } from '../grafico/grafico';
import { AdminEstadisticas } from './admin-estadisticas';

// jsdom no tiene canvas, así que Chart.js no puede dibujar: se reemplaza por un doble
// que solo deja ver qué datos recibe cada gráfico.
@Component({
  selector: 'app-grafico',
  template: `<div class="grafico-falso" [attr.data-tipo]="tipo()">
    {{ etiquetas().join('|') }} = {{ valores().join('|') }}
  </div>`,
})
class GraficoFalso {
  readonly tipo = input.required<string>();
  readonly etiquetas = input.required<string[]>();
  readonly valores = input.required<number[]>();
  readonly serie = input.required<string>();
  readonly descripcion = input('');
}

const base = `${environment.apiUrl}/estadisticas`;

describe('AdminEstadisticas', () => {
  let backend: HttpTestingController;
  let modalService: ModalService;

  function crear() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.overrideComponent(AdminEstadisticas, {
      remove: { imports: [Grafico] },
      add: { imports: [GraficoFalso] },
    });
    backend = TestBed.inject(HttpTestingController);
    modalService = TestBed.inject(ModalService);
    const fixture = TestBed.createComponent(AdminEstadisticas);
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;
    return { fixture, html };
  }

  function responderTodo(
    porUsuario: unknown[] = [],
    comentarios: object = { total: 0, porDia: [] },
    porPublicacion: unknown[] = [],
  ) {
    backend.expectOne((r) => r.url === `${base}/publicaciones-por-usuario`).flush(porUsuario);
    backend.expectOne((r) => r.url === `${base}/comentarios`).flush(comentarios);
    backend.expectOne((r) => r.url === `${base}/comentarios-por-publicacion`).flush(porPublicacion);
  }

  afterEach(() => {
    vi.useRealTimers();
    backend.verify();
  });

  it('al abrir pide las tres estadísticas y arma un gráfico de cada tipo', () => {
    const { fixture, html } = crear();
    responderTodo(
      [
        { usuarioId: 'u1', nombreUsuario: 'ana', cantidad: 4 },
        { usuarioId: 'u2', nombreUsuario: 'beto', cantidad: 2 },
      ],
      {
        total: 5,
        porDia: [
          { fecha: '2026-11-05', cantidad: 2 },
          { fecha: '2026-11-06', cantidad: 3 },
        ],
      },
      [{ publicacionId: 'p1', titulo: 'Reseña de Zelda', cantidad: 5 }],
    );
    fixture.detectChanges();

    const graficos = Array.from(html.querySelectorAll('.grafico-falso'));
    expect(graficos.map((g) => g.getAttribute('data-tipo'))).toEqual(['bar', 'line', 'pie']);
    expect(graficos[0].textContent).toContain('@ana|@beto = 4|2');
    expect(graficos[1].textContent).toContain('05/11|06/11 = 2|3');
    expect(graficos[2].textContent).toContain('Reseña de Zelda = 5');
    expect(html.textContent).toContain('Total en el lapso: 5');
  });

  it('sin datos muestra un aviso en lugar del gráfico', () => {
    const { fixture, html } = crear();
    responderTodo();
    fixture.detectChanges();

    expect(html.querySelectorAll('.grafico-falso').length).toBe(0);
    expect(html.textContent).toContain('No hay publicaciones en este lapso.');
    expect(html.textContent).toContain('No hay comentarios en este lapso.');
  });

  function elegirFecha(html: HTMLElement, id: 'desde' | 'hasta', valor: string) {
    const campo = html.querySelector(`#${id}`) as HTMLInputElement;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
  }

  function crearConTiempoFalso() {
    vi.useFakeTimers();
    const resultado = crear();
    responderTodo();
    resultado.fixture.detectChanges();
    return resultado;
  }

  it('usa los selectores clásicos Desde y Hasta, sin botón "Aplicar"', () => {
    const { html } = crearConTiempoFalso();

    expect((html.querySelector('#desde') as HTMLInputElement).type).toBe('date');
    expect((html.querySelector('#hasta') as HTMLInputElement).type).toBe('date');
    expect(html.querySelector('label[for="desde"]')?.textContent).toBe('Desde');
    expect(html.querySelector('label[for="hasta"]')?.textContent).toBe('Hasta');
    expect(html.textContent).not.toContain('Aplicar');
  });

  it('un clic en cualquier parte del campo de fecha abre el calendario del navegador', () => {
    // jsdom no implementa showPicker: se define para comprobar que se lo invoca.
    const showPicker = vi.fn();
    Object.defineProperty(HTMLInputElement.prototype, 'showPicker', {
      value: showPicker,
      configurable: true,
    });
    const { html } = crearConTiempoFalso();

    (html.querySelector('#desde') as HTMLInputElement).click();
    (html.querySelector('#hasta') as HTMLInputElement).click();

    expect(showPicker).toHaveBeenCalledTimes(2);
    delete (HTMLInputElement.prototype as { showPicker?: unknown }).showPicker;
  });

  it('el título es igual al de Publicaciones (clase titulo-marca)', () => {
    const { html } = crearConTiempoFalso();
    const titulo = html.querySelector('h2') as HTMLElement;

    expect(titulo.textContent).toBe('Estadísticas');
    expect(titulo.classList.contains('titulo-marca')).toBe(true);
  });

  it('al elegir las fechas vuelve a pedir los tres, solo', () => {
    const { html } = crearConTiempoFalso();

    elegirFecha(html, 'desde', '2026-11-01');
    elegirFecha(html, 'hasta', '2026-11-13');
    backend.expectNone((r) => r.url.startsWith(base)); // todavía dentro del retraso
    vi.advanceTimersByTime(300);

    for (const ruta of [
      'publicaciones-por-usuario',
      'comentarios',
      'comentarios-por-publicacion',
    ]) {
      const pedido = backend.expectOne((r) => r.url === `${base}/${ruta}`);
      expect(pedido.request.params.get('desde')).toBe('2026-11-01');
      expect(pedido.request.params.get('hasta')).toBe('2026-11-13');
      pedido.flush(ruta === 'comentarios' ? { total: 0, porDia: [] } : []);
    }
  });

  it('con una sola fecha deja abierto el otro extremo', () => {
    const { html } = crearConTiempoFalso();

    elegirFecha(html, 'desde', '2026-11-01');
    vi.advanceTimersByTime(300);

    const pedido = backend.expectOne((r) => r.url === `${base}/comentarios`);
    expect(pedido.request.params.get('desde')).toBe('2026-11-01');
    expect(pedido.request.params.has('hasta')).toBe(false);
    backend.match((r) => r.url.startsWith(base));
  });

  it('varios cambios seguidos hacen un solo pedido por estadística', () => {
    const { html } = crearConTiempoFalso();

    elegirFecha(html, 'desde', '2026-11-01');
    vi.advanceTimersByTime(100);
    elegirFecha(html, 'desde', '2026-11-02');
    vi.advanceTimersByTime(300);

    const pedidos = backend.match((r) => r.url === `${base}/comentarios`);
    expect(pedidos.length).toBe(1);
    expect(pedidos[0].request.params.get('desde')).toBe('2026-11-02');
    backend.match((r) => r.url.startsWith(base)); // descarta los otros dos
  });

  it('cada campo limita al otro (desde <= hasta) en el selector', () => {
    const { fixture, html } = crearConTiempoFalso();

    elegirFecha(html, 'desde', '2026-11-05');
    elegirFecha(html, 'hasta', '2026-11-20');
    fixture.detectChanges();

    expect((html.querySelector('#desde') as HTMLInputElement).max).toBe('2026-11-20');
    expect((html.querySelector('#hasta') as HTMLInputElement).min).toBe('2026-11-05');
  });

  it('si "desde" es posterior a "hasta" avisa con un modal y no pide nada', () => {
    const { html } = crearConTiempoFalso();
    const error = vi.spyOn(modalService, 'error');

    elegirFecha(html, 'desde', '2026-11-13');
    elegirFecha(html, 'hasta', '2026-11-01');
    vi.advanceTimersByTime(300);

    expect(error).toHaveBeenCalledOnce();
    backend.expectNone((r) => r.url.startsWith(base));
  });

  it('"Ver todo" está deshabilitado sin fechas y, con ellas, las limpia y vuelve a pedir sin lapso', () => {
    const { fixture, html } = crearConTiempoFalso();
    const ver = () =>
      Array.from(html.querySelectorAll('button')).find((b) => b.textContent?.includes('Ver todo'))!;
    expect(ver().disabled).toBe(true);

    elegirFecha(html, 'desde', '2026-11-01');
    vi.advanceTimersByTime(300);
    backend
      .match((r) => r.url.startsWith(base))
      .forEach((p) =>
        p.flush(p.request.url.endsWith('/comentarios') ? { total: 0, porDia: [] } : []),
      );
    fixture.detectChanges();
    expect(ver().disabled).toBe(false);

    ver().click();
    vi.advanceTimersByTime(300);
    const pedido = backend.expectOne((r) => r.url === `${base}/comentarios`);
    expect(pedido.request.params.has('desde')).toBe(false);
    expect(pedido.request.params.has('hasta')).toBe(false);
    backend.match((r) => r.url.startsWith(base));
  });

  it('si el back falla muestra el modal de error', () => {
    const { fixture, html } = crear();
    const error = vi.spyOn(modalService, 'error');

    backend
      .expectOne((r) => r.url === `${base}/publicaciones-por-usuario`)
      .flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    // forkJoin cancela los otros dos al fallar el primero: se confirma y se descartan.
    const cancelados = backend.match((r) => r.url.startsWith(base));
    expect(cancelados.length).toBe(2);
    expect(cancelados.every((c) => c.cancelled)).toBe(true);
    fixture.detectChanges();

    expect(error).toHaveBeenCalledOnce();
    expect(html.textContent).toContain('No pudimos cargar las estadísticas');
  });
});
