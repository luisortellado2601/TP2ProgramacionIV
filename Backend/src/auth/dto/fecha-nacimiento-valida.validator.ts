import { ValidationOptions, registerDecorator } from 'class-validator';

const FECHA_MINIMA = new Date('1900-01-01');

// La fecha de nacimiento no puede ser futura ni anterior a 1900.
export function FechaNacimientoValida(opciones?: ValidationOptions) {
  return (objeto: object, propiedad: string) => {
    registerDecorator({
      name: 'fechaNacimientoValida',
      target: objeto.constructor,
      propertyName: propiedad,
      options: opciones,
      validator: {
        validate(valor: unknown): boolean {
          if (typeof valor !== 'string') {
            return false;
          }
          const fecha = new Date(valor);
          return (
            !Number.isNaN(fecha.getTime()) &&
            fecha >= FECHA_MINIMA &&
            fecha <= new Date()
          );
        },
      },
    });
  };
}
