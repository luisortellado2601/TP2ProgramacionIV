import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ModalService } from '../../services/modal';
import { Companeros } from './companeros';

const CLAVE_SESION = 'nextplay_sesion';
const URL = `${environment.apiUrl}/busquedas`;

function usuario(id: string, perfil = 'usuario') {
  return {
    id,
    nombre: 'Ana',
    apellido: 'Gómez',
    correo: 'ana@mail.com',
    nombreUsuario: 'ana',
    fechaNacimiento: '1999-05-20T00:00:00.000Z',
    perfil,
    habilitado: true,
    fechaAlta: '2026-01-01T00:00:00.000Z',
  };
}

function autor(id: string, nombreUsuario = 'beto') {
  return { id, nombre: 'Beto', apellido: 'Ruiz', nombreUsuario };
}

function busqueda(id: string, autorId: string, extra: object = {}) {
  return {
    id,
    juego: 'Valorant',
    region: 'Sudamérica',
    plataforma: 'PC',
    descripcion: 'Buscamos dos para ranked',
    fecha: new Date().toISOString(),
    autor: autor(autorId),
    respuestas: [],
    ...extra,
  };
}

describe('Companeros', () => {
  let backend: HttpTestingController;

  function crear(sesion = usuario('u1')) {
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ usuario: sesion, token: 'a.b.c' }));
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    backend = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(Companeros);
    fixture.detectChanges();
    return { fixture, html: fixture.nativeElement as HTMLElement };
  }

  const pedidoListado = () => backend.expectOne((r) => r.method === 'GET' && r.url === URL);

  function elegir(html: HTMLElement, id: string, valor: string) {
    const campo = html.querySelector(`#${id}`) as HTMLSelectElement;
    campo.value = valor;
    campo.dispatchEvent(new Event('change'));
  }

  afterEach(() => localStorage.clear());

  it('al abrir pide el listado sin filtros y muestra cada búsqueda con sus datos en cuadritos', () => {
    const { fixture, html } = crear();

    const pedido = pedidoListado();
    expect(pedido.request.params.get('offset')).toBe('0');
    expect(pedido.request.params.has('juego')).toBe(false);
    pedido.flush({ total: 1, busquedas: [busqueda('b1', 'u2')] });
    fixture.detectChanges();

    const chips = Array.from(html.querySelectorAll('.busqueda__chips li')).map((li) =>
      li.textContent?.trim(),
    );
    expect(chips).toEqual(['Valorant', 'Sudamérica', 'PC']);
    const texto = html.querySelector('.busqueda')?.textContent ?? '';
    expect(texto).toContain('@beto busca compañeros');
    expect(texto).toContain('Buscamos dos para ranked');
  });

  it('muestra la plataforma elegida en un cuadrito', () => {
    const { fixture, html } = crear();

    pedidoListado().flush({
      total: 1,
      busquedas: [busqueda('b1', 'u2', { plataforma: 'PlayStation' })],
    });
    fixture.detectChanges();

    expect(html.querySelector('.busqueda__chips')?.textContent).toContain('PlayStation');
  });

  it('sin resultados invita a publicar la propia búsqueda', () => {
    const { fixture, html } = crear();

    pedidoListado().flush({ total: 0, busquedas: [] });
    fixture.detectChanges();

    expect(html.textContent).toContain('No hay búsquedas con esos filtros');
  });

  it('cambiar un filtro no busca hasta apretar el botón Buscar', () => {
    const { fixture, html } = crear();
    pedidoListado().flush({ total: 0, busquedas: [] });
    fixture.detectChanges();

    elegir(html, 'f-region', 'Europa');
    elegir(html, 'f-plataforma', 'PlayStation');
    backend.expectNone((r) => r.method === 'GET');

    (html.querySelector('.companeros__botones .btn-primary') as HTMLButtonElement).click();
    const params = pedidoListado().request.params;
    expect(params.get('region')).toBe('Europa');
    expect(params.get('plataforma')).toBe('PlayStation');
    expect(params.get('offset')).toBe('0');
  });

  it('Limpiar borra los filtros y vuelve a buscar', () => {
    const { fixture, html } = crear();
    pedidoListado().flush({ total: 0, busquedas: [] });
    fixture.detectChanges();
    elegir(html, 'f-region', 'Europa');

    (html.querySelector('.companeros__botones .btn-secondary') as HTMLButtonElement).click();

    expect(pedidoListado().request.params.has('region')).toBe(false);
  });

  it('el buscador solo tiene juego, región y plataforma', () => {
    const { html } = crear();
    pedidoListado().flush({ total: 0, busquedas: [] });

    const campos = Array.from(html.querySelectorAll('.companeros__filtros select')).map(
      (s) => s.id,
    );
    expect(campos).toEqual(['f-juego', 'f-region', 'f-plataforma']);
    expect(html.textContent).not.toContain('Micrófono');
    expect(html.textContent).not.toContain('Modo');
  });

  it('en la vista de publicar no aparecen ni el buscador ni las búsquedas, y viceversa', () => {
    const { fixture, html } = crear();
    pedidoListado().flush({ total: 1, busquedas: [busqueda('b1', 'u2')] });
    fixture.detectChanges();
    expect(html.querySelector('.companeros__filtros')).not.toBeNull();
    expect(html.querySelectorAll('.busqueda').length).toBe(1);
    expect(html.querySelector('.companeros__form')).toBeNull();

    (html.querySelector('#modo-publicar') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(html.querySelector('.companeros__form')).not.toBeNull();
    expect(html.querySelector('.companeros__filtros')).toBeNull();
    expect(html.querySelectorAll('.busqueda').length).toBe(0);
    expect(html.querySelector('#modo-publicar')?.getAttribute('aria-pressed')).toBe('true');

    (html.querySelector('#modo-buscar') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(html.querySelector('.companeros__form')).toBeNull();
    expect(html.querySelectorAll('.busqueda').length).toBe(1);
    expect(html.querySelector('#modo-buscar')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('al publicar vuelve a la vista de búsqueda y muestra el listado actualizado', () => {
    const { fixture, html } = crear();
    pedidoListado().flush({ total: 0, busquedas: [] });
    (html.querySelector('#modo-publicar') as HTMLButtonElement).click();
    fixture.detectChanges();
    elegir(html, 'nuevo-juego', 'Valorant');
    (html.querySelector('.companeros__form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    backend.expectOne((r) => r.method === 'POST' && r.url === URL).flush(busqueda('b9', 'u1'));
    pedidoListado().flush({ total: 1, busquedas: [busqueda('b9', 'u1')] });
    fixture.detectChanges();

    expect(html.querySelector('.companeros__form')).toBeNull();
    expect(html.querySelectorAll('.busqueda').length).toBe(1);
  });

  it('"Ver más" pide la página siguiente y suma los resultados', () => {
    const { fixture, html } = crear();
    pedidoListado().flush({ total: 3, busquedas: [busqueda('b1', 'u2'), busqueda('b2', 'u2')] });
    fixture.detectChanges();

    const boton = Array.from(html.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Ver más'),
    ) as HTMLButtonElement;
    boton.click();
    const pedido = pedidoListado();
    expect(pedido.request.params.get('offset')).toBe('2');
    pedido.flush({ total: 3, busquedas: [busqueda('b3', 'u2')] });
    fixture.detectChanges();

    expect(html.querySelectorAll('.busqueda').length).toBe(3);
    expect(html.textContent).not.toContain('Ver más');
  });

  it('el botón para cerrar aparece solo en las búsquedas propias (o para un administrador)', () => {
    const { fixture, html } = crear(usuario('u1'));

    pedidoListado().flush({ total: 2, busquedas: [busqueda('b1', 'u1'), busqueda('b2', 'u2')] });
    fixture.detectChanges();

    const tarjetas = html.querySelectorAll('.busqueda');
    expect(tarjetas[0].querySelector('.busqueda__cerrar')).not.toBeNull();
    expect(tarjetas[1].querySelector('.busqueda__cerrar')).toBeNull();
  });

  it('un administrador puede cerrar la de cualquiera', () => {
    const { fixture, html } = crear(usuario('admin', 'administrador'));

    pedidoListado().flush({ total: 1, busquedas: [busqueda('b2', 'u2')] });
    fixture.detectChanges();

    expect(html.querySelector('.busqueda__cerrar')).not.toBeNull();
  });

  it('cerrar pide confirmación y, al aceptar, la saca del listado', () => {
    const { fixture, html } = crear();
    pedidoListado().flush({ total: 1, busquedas: [busqueda('b1', 'u1')] });
    fixture.detectChanges();

    (html.querySelector('.busqueda__cerrar') as HTMLButtonElement).click();
    const estado = TestBed.inject(ModalService).estado();
    expect(estado?.mensaje).toContain('Valorant');
    estado?.onConfirmar?.();
    backend.expectOne(`${URL}/b1`).flush({ id: 'b1', cerrada: true });
    fixture.detectChanges();

    expect(html.querySelectorAll('.busqueda').length).toBe(0);
  });

  it('publicar envía los datos del formulario y refresca el listado', () => {
    const { fixture, html } = crear();
    pedidoListado().flush({ total: 0, busquedas: [] });
    (html.querySelector('#modo-publicar') as HTMLButtonElement).click();
    fixture.detectChanges();

    elegir(html, 'nuevo-juego', 'Valorant');
    (html.querySelector('.companeros__form') as HTMLFormElement).dispatchEvent(new Event('submit'));

    const envio = backend.expectOne((r) => r.method === 'POST' && r.url === URL);
    expect(envio.request.body).toEqual({
      juego: 'Valorant',
      region: 'Sudamérica',
      plataforma: 'PC',
    });
    envio.flush(busqueda('b9', 'u1'));
    pedidoListado().flush({ total: 1, busquedas: [busqueda('b9', 'u1')] });
  });

  it('no publica si falta elegir el juego', () => {
    const { fixture, html } = crear();
    pedidoListado().flush({ total: 0, busquedas: [] });
    (html.querySelector('#modo-publicar') as HTMLButtonElement).click();
    fixture.detectChanges();

    (html.querySelector('.companeros__form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    backend.expectNone((r) => r.method === 'POST');
    expect(html.textContent).toContain('Elegí el juego.');
  });

  describe('contactar', () => {
    const conMensajes = {
      respuestas: [
        {
          id: 'r1',
          mensaje: 'Me sumo, juego de noche',
          fecha: new Date().toISOString(),
          autor: autor('u3', 'cami'),
        },
      ],
    };

    function abrirContacto() {
      const entorno = crear();
      pedidoListado().flush({ total: 1, busquedas: [busqueda('b1', 'u2', conMensajes)] });
      entorno.fixture.detectChanges();
      return entorno;
    }

    it('cada tarjeta tiene un botón Contactar con la cantidad de mensajes', () => {
      const { html } = abrirContacto();

      expect(html.querySelector('.busqueda__contactar')?.textContent?.trim()).toBe('Contactar (1)');
      expect(html.querySelector('.contacto')).toBeNull();
    });

    it('al tocar Contactar se despliegan los mensajes y la caja para escribir', () => {
      const { fixture, html } = abrirContacto();

      (html.querySelector('.busqueda__contactar') as HTMLButtonElement).click();
      fixture.detectChanges();

      const contacto = html.querySelector('.contacto')?.textContent ?? '';
      expect(contacto).toContain('@cami');
      expect(contacto).toContain('Me sumo, juego de noche');
      expect(html.querySelector('.contacto textarea')).not.toBeNull();
      expect(html.querySelector('.busqueda__contactar')?.getAttribute('aria-expanded')).toBe(
        'true',
      );

      (html.querySelector('.busqueda__contactar') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(html.querySelector('.contacto')).toBeNull();
    });

    it('sin mensajes invita a ser el primero en contactar', () => {
      const { fixture, html } = crear();
      pedidoListado().flush({ total: 1, busquedas: [busqueda('b1', 'u2')] });
      fixture.detectChanges();

      (html.querySelector('.busqueda__contactar') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(html.querySelector('.contacto')?.textContent).toContain('primero en contactar');
    });

    it('en la búsqueda propia no se puede escribir: solo se leen los mensajes recibidos', () => {
      const { fixture, html } = crear(usuario('u2'));
      pedidoListado().flush({ total: 1, busquedas: [busqueda('b1', 'u2', conMensajes)] });
      fixture.detectChanges();

      const boton = html.querySelector('.busqueda__contactar') as HTMLButtonElement;
      expect(boton.textContent?.trim()).toBe('Mensajes (1)');
      boton.click();
      fixture.detectChanges();

      expect(html.querySelector('.contacto')?.textContent).toContain('Me sumo, juego de noche');
      expect(html.querySelector('.contacto textarea')).toBeNull();
      expect(html.querySelector('.contacto__acciones')).toBeNull();
    });

    it('en la búsqueda propia sin mensajes avisa que nadie escribió todavía', () => {
      const { fixture, html } = crear(usuario('u2'));
      pedidoListado().flush({ total: 1, busquedas: [busqueda('b1', 'u2')] });
      fixture.detectChanges();

      (html.querySelector('.busqueda__contactar') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(html.querySelector('.contacto')?.textContent).toContain('nadie te escribió');
    });

    it('enviar un mensaje lo manda al back, lo suma a la lista y limpia la caja', () => {
      const { fixture, html } = abrirContacto();
      (html.querySelector('.busqueda__contactar') as HTMLButtonElement).click();
      fixture.detectChanges();

      const caja = html.querySelector('.contacto textarea') as HTMLTextAreaElement;
      caja.value = '  Hola, ¿sigue disponible?  ';
      (html.querySelector('.contacto__acciones .btn') as HTMLButtonElement).click();

      const envio = backend.expectOne(`${URL}/b1/respuestas`);
      expect(envio.request.method).toBe('POST');
      expect(envio.request.body).toEqual({ mensaje: 'Hola, ¿sigue disponible?' });
      envio.flush({
        id: 'r2',
        mensaje: 'Hola, ¿sigue disponible?',
        fecha: new Date().toISOString(),
        autor: autor('u1', 'ana'),
      });
      fixture.detectChanges();

      expect(caja.value).toBe('');
      expect(html.querySelectorAll('.contacto__mensaje').length).toBe(2);
      expect(html.querySelector('.busqueda__contactar')?.textContent?.trim()).toBe('Contactar (2)');
    });

    it('no envía un mensaje vacío', () => {
      const { fixture, html } = abrirContacto();
      (html.querySelector('.busqueda__contactar') as HTMLButtonElement).click();
      fixture.detectChanges();

      (html.querySelector('.contacto textarea') as HTMLTextAreaElement).value = '   ';
      (html.querySelector('.contacto__acciones .btn') as HTMLButtonElement).click();

      backend.expectNone((r) => r.method === 'POST');
      expect(TestBed.inject(ModalService).estado()?.mensaje).toContain('Escribí un mensaje');
    });

    it('si el back rechaza el mensaje, lo muestra y conserva lo escrito', () => {
      const { fixture, html } = abrirContacto();
      (html.querySelector('.busqueda__contactar') as HTMLButtonElement).click();
      fixture.detectChanges();
      const caja = html.querySelector('.contacto textarea') as HTMLTextAreaElement;
      caja.value = 'Hola';

      (html.querySelector('.contacto__acciones .btn') as HTMLButtonElement).click();
      backend
        .expectOne(`${URL}/b1/respuestas`)
        .flush(
          { message: 'Esta búsqueda ya alcanzó el máximo de mensajes' },
          { status: 409, statusText: 'Conflict' },
        );

      expect(TestBed.inject(ModalService).estado()?.mensaje).toContain('máximo de mensajes');
      expect(caja.value).toBe('Hola');
    });
  });
});
