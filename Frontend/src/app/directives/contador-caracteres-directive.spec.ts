import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { ContadorCaracteresDirective } from './contador-caracteres-directive';

@Component({
  imports: [ReactiveFormsModule, ContadorCaracteresDirective],
  template: `
    <div id="caja">
      @if (visible()) {
        <textarea [formControl]="control" [appContadorCaracteres]="10"></textarea>
      }
    </div>
  `,
})
class Anfitrion {
  visible = signal(true);
  control = new FormControl('', { nonNullable: true });
}

describe('ContadorCaracteresDirective', () => {
  function crear() {
    const fixture = TestBed.createComponent(Anfitrion);
    fixture.detectChanges();
    const contador = () => fixture.nativeElement.querySelector('.contador-caracteres') as HTMLElement | null;
    return { fixture, contador };
  }

  it('muestra "0 / máximo" al iniciar, debajo del campo', () => {
    const { fixture, contador } = crear();
    expect(contador()?.textContent).toBe('0 / 10');
    expect(fixture.nativeElement.querySelector('textarea').nextElementSibling).toBe(contador());
  });

  it('se actualiza al escribir', () => {
    const { fixture, contador } = crear();
    const campo = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    campo.value = 'hola';
    campo.dispatchEvent(new Event('input'));
    expect(contador()?.textContent).toBe('4 / 10');
  });

  it('se actualiza cuando el formulario cambia el valor por código', () => {
    const { fixture, contador } = crear();
    fixture.componentInstance.control.setValue('abc');
    expect(contador()?.textContent).toBe('3 / 10');

    fixture.componentInstance.control.reset();
    expect(contador()?.textContent).toBe('0 / 10');
  });

  it('queda amarillo desde el 90 % del máximo', () => {
    const { fixture, contador } = crear();
    fixture.componentInstance.control.setValue('12345678');
    expect(contador()?.classList.contains('contador-caracteres--limite')).toBe(false);

    fixture.componentInstance.control.setValue('123456789');
    expect(contador()?.classList.contains('contador-caracteres--limite')).toBe(true);
    expect(contador()?.classList.contains('contador-caracteres--lleno')).toBe(false);
    expect(contador()?.textContent).toBe('9 / 10');
  });

  it('al completar el máximo se pone rojo y avisa con "!"', () => {
    const { fixture, contador } = crear();
    fixture.componentInstance.control.setValue('1234567890');
    expect(contador()?.classList.contains('contador-caracteres--lleno')).toBe(true);
    expect(contador()?.classList.contains('contador-caracteres--limite')).toBe(false);
    expect(contador()?.textContent).toBe('10 / 10 · ¡Límite alcanzado!');

    // Si se borra algo, vuelve al estado normal.
    fixture.componentInstance.control.setValue('12345');
    expect(contador()?.classList.contains('contador-caracteres--lleno')).toBe(false);
    expect(contador()?.textContent).toBe('5 / 10');
  });

  it('quita el contador cuando el campo se destruye', () => {
    const { fixture, contador } = crear();
    expect(contador()).not.toBeNull();

    // Se destruye solo el campo (no su contenedor): el contador, que es su hermano, no puede quedar.
    fixture.componentInstance.visible.set(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('textarea')).toBeNull();
    expect(contador()).toBeNull();
  });
});
