import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const FECHA_NACIMIENTO_MINIMA = '1900-01-01';

export function fechaNacimientoValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value;
    if (typeof valor !== 'string' || valor.length === 0) {
      return null;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor) || Number.isNaN(new Date(valor).getTime())) {
      return { fechaInvalida: true };
    }
    if (valor > fechaDeHoy()) {
      return { fechaFutura: true };
    }
    if (valor < FECHA_NACIMIENTO_MINIMA) {
      return { fechaMuyAntigua: true };
    }
    return null;
  };
}

export function fechaDeHoy(): string {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}
