import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../environments/environment';
import { EstadisticasService } from './estadisticas';

describe('EstadisticasService', () => {
  let servicio: EstadisticasService;
  let backend: HttpTestingController;
  const base = `${environment.apiUrl}/estadisticas`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(EstadisticasService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('publicaciones por usuario: pide la ruta con el lapso', () => {
    servicio.publicacionesPorUsuario({ desde: '2026-11-01', hasta: '2026-11-13' }).subscribe();

    const pedido = backend.expectOne((r) => r.url === `${base}/publicaciones-por-usuario`);
    expect(pedido.request.method).toBe('GET');
    expect(pedido.request.params.get('desde')).toBe('2026-11-01');
    expect(pedido.request.params.get('hasta')).toBe('2026-11-13');
    pedido.flush([]);
  });

  it('comentarios: pide la ruta con el lapso', () => {
    servicio.comentarios({ desde: '2026-11-01', hasta: '2026-11-13' }).subscribe();

    const pedido = backend.expectOne((r) => r.url === `${base}/comentarios`);
    expect(pedido.request.params.get('desde')).toBe('2026-11-01');
    expect(pedido.request.params.get('hasta')).toBe('2026-11-13');
    pedido.flush({ total: 0, porDia: [] });
  });

  it('comentarios por publicación: pide la ruta con el lapso', () => {
    servicio.comentariosPorPublicacion({ desde: '2026-11-01' }).subscribe();

    const pedido = backend.expectOne((r) => r.url === `${base}/comentarios-por-publicacion`);
    expect(pedido.request.params.get('desde')).toBe('2026-11-01');
    pedido.flush([]);
  });

  it('sin lapso no manda desde ni hasta', () => {
    servicio.comentarios({}).subscribe();

    const pedido = backend.expectOne((r) => r.url === `${base}/comentarios`);
    expect(pedido.request.params.has('desde')).toBe(false);
    expect(pedido.request.params.has('hasta')).toBe(false);
    pedido.flush({ total: 0, porDia: [] });
  });
});
