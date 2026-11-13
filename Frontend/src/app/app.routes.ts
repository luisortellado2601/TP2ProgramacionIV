import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';
import { guestGuard } from './guards/guest-guard';
import { adminGuard } from './guards/admin-guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./componentes/cargando/cargando').then((m) => m.Cargando),
  },
  {
    path: 'login',
    loadComponent: () => import('./componentes/login/login').then((m) => m.Login),
    canActivate: [guestGuard],
  },
  {
    path: 'registro',
    loadComponent: () => import('./componentes/registro/registro').then((m) => m.Registro),
    canActivate: [guestGuard],
  },
  {
    path: 'publicaciones',
    loadComponent: () =>
      import('./componentes/publicaciones/publicaciones').then((m) => m.Publicaciones),
    canActivate: [authGuard],
  },
  {
    path: 'publicaciones/:id',
    loadComponent: () =>
      import('./componentes/publicacion-detalle/publicacion-detalle').then(
        (m) => m.PublicacionDetalle,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'perfil',
    loadComponent: () => import('./componentes/mi-perfil/mi-perfil').then((m) => m.MiPerfil),
    canActivate: [authGuard],
  },
  {
    path: 'perfil/editar',
    loadComponent: () =>
      import('./componentes/editar-perfil/editar-perfil').then((m) => m.EditarPerfil),
    canActivate: [authGuard],
  },
  {
    path: 'admin/usuarios',
    loadComponent: () =>
      import('./componentes/admin-usuarios/admin-usuarios').then((m) => m.AdminUsuarios),
    canActivate: [authGuard, adminGuard],
  },
  {
    path: 'admin/usuarios/nuevo',
    loadComponent: () =>
      import('./componentes/admin-alta-usuario/admin-alta-usuario').then((m) => m.AdminAltaUsuario),
    canActivate: [authGuard, adminGuard],
  },
  {
    path: 'admin/estadisticas',
    loadComponent: () =>
      import('./componentes/admin-estadisticas/admin-estadisticas').then(
        (m) => m.AdminEstadisticas,
      ),
    canActivate: [authGuard, adminGuard],
  },
  { path: '**', redirectTo: 'publicaciones' },
];
