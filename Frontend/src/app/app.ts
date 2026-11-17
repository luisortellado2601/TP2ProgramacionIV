import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './componentes/navbar/navbar';
import { Modal } from './componentes/modal/modal';
import { ActualizacionService } from './services/actualizacion';

@Component({
  imports: [RouterOutlet, Navbar, Modal],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  constructor() {
    inject(ActualizacionService).iniciar();
  }
}
