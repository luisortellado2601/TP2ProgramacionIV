import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ActualizarPerfilDto } from './actualizar-perfil.dto.js';

// Mismo ValidationPipe que usa main.ts, para probar el comportamiento real de la ruta.
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const validar = (body: unknown) =>
  pipe.transform(body, { type: 'body', metatype: ActualizarPerfilDto });

const valido = {
  nombre: 'Ana',
  apellido: 'Gómez',
  fechaNacimiento: '1999-05-20',
};

async function mensajes(body: unknown): Promise<string[]> {
  try {
    await validar(body);
    return [];
  } catch (error) {
    expect(error).toBeInstanceOf(BadRequestException);
    const respuesta = (error as BadRequestException).getResponse() as {
      message: string[];
    };
    return respuesta.message;
  }
}

describe('ActualizarPerfilDto (PUT /usuarios/me)', () => {
  it('acepta los datos válidos y recorta los espacios', async () => {
    const dto = (await validar({
      ...valido,
      nombre: '  Ana  ',
      descripcion: '  Hola  ',
    })) as ActualizarPerfilDto;

    expect(dto.nombre).toBe('Ana');
    expect(dto.descripcion).toBe('Hola');
  });

  it('la descripción y la imagen son opcionales; la descripción puede ir vacía', async () => {
    expect(await mensajes(valido)).toEqual([]);
    expect(await mensajes({ ...valido, descripcion: '' })).toEqual([]);
  });

  it.each([
    'correo',
    'nombreUsuario',
    'contrasena',
    'repetirContrasena',
    'perfil',
    'habilitado',
    'id',
    'usuarioId',
  ])('rechaza (400) el campo no editable "%s"', async (campo) => {
    const errores = await mensajes({ ...valido, [campo]: 'administrador' });
    expect(errores.join(' ')).toContain(campo);
  });

  it('exige nombre, apellido y fecha de nacimiento', async () => {
    const errores = (await mensajes({})).join(' | ');
    expect(errores).toContain('El nombre es obligatorio');
    expect(errores).toContain('El apellido es obligatorio');
    expect(errores).toContain('La fecha de nacimiento no es válida');
  });

  it('aplica las mismas reglas que el registro', async () => {
    expect(await mensajes({ ...valido, nombre: 'A' })).toContain(
      'El nombre debe tener al menos 2 caracteres',
    );
    expect(await mensajes({ ...valido, nombre: 'Ana123' })).toContain(
      'El nombre solo puede contener letras, espacios, apóstrofes y guiones',
    );
    expect(await mensajes({ ...valido, apellido: 'x'.repeat(51) })).toContain(
      'El apellido no puede superar los 50 caracteres',
    );
    expect(
      await mensajes({ ...valido, descripcion: 'x'.repeat(281) }),
    ).toContain('La descripción no puede superar los 280 caracteres');
  });

  it('rechaza una fecha de nacimiento futura o anterior a 1900', async () => {
    const mensaje =
      'La fecha de nacimiento no puede ser futura ni anterior a 1900';
    expect(
      await mensajes({ ...valido, fechaNacimiento: '2999-01-01' }),
    ).toContain(mensaje);
    expect(
      await mensajes({ ...valido, fechaNacimiento: '1899-12-31' }),
    ).toContain(mensaje);
  });

  it('solo acepta imágenes JPG, PNG o WEBP en data URL', async () => {
    expect(
      await mensajes({ ...valido, imagenPerfil: 'data:image/png;base64,AAAA' }),
    ).toEqual([]);
    expect(
      await mensajes({ ...valido, imagenPerfil: 'data:image/gif;base64,AAAA' }),
    ).toContain('La imagen de perfil debe ser un archivo JPG, PNG o WEBP');
    expect(
      await mensajes({ ...valido, imagenPerfil: 'http://x.com/a.png' }),
    ).toContain('La imagen de perfil debe ser un archivo JPG, PNG o WEBP');
  });
});
