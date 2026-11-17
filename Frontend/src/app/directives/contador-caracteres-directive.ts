import {
  Directive,
  ElementRef,
  OnDestroy,
  OnInit,
  Renderer2,
  inject,
  input,
  numberAttribute,
} from '@angular/core';
import { NgControl } from '@angular/forms';
import { Subscription } from 'rxjs';

@Directive({ selector: 'textarea[appContadorCaracteres], input[appContadorCaracteres]' })
export class ContadorCaracteresDirective implements OnInit, OnDestroy {
  private readonly campo =
    inject<ElementRef<HTMLInputElement | HTMLTextAreaElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly control = inject(NgControl, { self: true, optional: true });

  readonly maximo = input.required<number, unknown>({
    alias: 'appContadorCaracteres',
    transform: numberAttribute,
  });

  private contador!: HTMLElement;
  private suscripcion?: Subscription;
  private quitarEscucha?: () => void;

  ngOnInit(): void {
    this.contador = this.renderer.createElement('small');
    this.renderer.addClass(this.contador, 'contador-caracteres');
    this.renderer.setAttribute(this.contador, 'aria-hidden', 'true');
    this.renderer.insertBefore(this.campo.parentNode, this.contador, this.campo.nextSibling);

    this.quitarEscucha = this.renderer.listen(this.campo, 'input', () => this.actualizar());
    this.suscripcion = this.control?.valueChanges?.subscribe(() => this.actualizar());
    this.actualizar();
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
    this.quitarEscucha?.();
    this.contador?.remove();
  }

  private actualizar(): void {
    const texto = this.control?.value ?? this.campo.value ?? '';
    const largo = String(texto).length;
    const maximo = this.maximo();
    const lleno = largo >= maximo;
    const cerca = largo >= maximo * 0.9;

    this.renderer.setProperty(
      this.contador,
      'textContent',
      lleno ? `${largo} / ${maximo} · ¡Límite alcanzado!` : `${largo} / ${maximo}`,
    );
    this.alternarClase('contador-caracteres--limite', cerca && !lleno);
    this.alternarClase('contador-caracteres--lleno', lleno);
  }

  private alternarClase(clase: string, activa: boolean): void {
    if (activa) {
      this.renderer.addClass(this.contador, clase);
    } else {
      this.renderer.removeClass(this.contador, clase);
    }
  }
}
