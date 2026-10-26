# NextPlay – Frontend

Frontend en **Angular 22** de NextPlay, la red social de videojuegos del TP #2 de Programación IV (UTN Avellaneda).
Consume la API NestJS de la carpeta [`../Backend`](../Backend). El estado del proyecto y los sprints están en [`../Backend/README.md`](../Backend/README.md).

## Requisitos

- Node.js 22 o superior y npm.
- El backend levantado en `http://localhost:3000` (ver `../Backend/README.md`).

## Cómo levantarlo

```bash
npm install
npm start            # ng serve → http://localhost:4200
```

Otros comandos:

| Comando | Qué hace |
|---|---|
| `npm run build` | Build de producción en `dist/nextplay-frontend` |
| `npm test` | Tests unitarios con Vitest |
| `npm run watch` | Build en modo desarrollo, recompilando al guardar |

## Configuración de la API

La URL del backend se define en los environments:

- `src/environments/environment.development.ts` → se usa con `ng serve` (`http://localhost:3000`).
- `src/environments/environment.ts` → se usa en el build de producción y apunta al backend desplegado en Vercel (`https://nextplay-delta.vercel.app`). Si cambia la URL del backend hay que actualizar `apiUrl` y redeployar el front.

## Deploy

Proyecto de Vercel con *Root Directory* `Frontend` (https://nextplaygaming.vercel.app). `vercel.json` define el build, la carpeta de salida y redirige todas las rutas a `index.html`. No usa variables de entorno. Cada push a `master` redeploya.

## Estructura

```
src/
├── app/
│   ├── componentes/
│   │   ├── login/          Login por correo o nombre de usuario
│   │   ├── registro/       Registro con validaciones por campo
│   │   ├── publicaciones/  Listado de publicaciones (esqueleto, contenido en Sprint #2)
│   │   ├── mi-perfil/      Datos del usuario logueado (publicaciones en Sprint #2)
│   │   ├── navbar/         Navegación y cierre de sesión
│   │   └── modal/          Modal global de éxito / error / confirmación (reemplaza alert())
│   ├── guards/             authGuard (requiere sesión) y guestGuard (solo sin sesión)
│   ├── models/             Interfaces de usuario, sesión y payloads
│   ├── services/           AuthService (sesión en localStorage) y ModalService
│   ├── utils/              Validadores propios y helper de mensajes de error
│   ├── app.routes.ts       Rutas con lazy loading
│   └── app.config.ts       Providers (router, HttpClient)
├── environments/           URL de la API por entorno
└── styles.css              Sistema de diseño global (variables, formularios, botones)
```

## Rutas

| Ruta | Componente | Acceso |
|---|---|---|
| `/login` | Login | Solo sin sesión |
| `/registro` | Registro | Solo sin sesión |
| `/publicaciones` | Publicaciones | Requiere sesión |
| `/perfil` | Mi perfil | Requiere sesión |
| cualquier otra | redirige a `/publicaciones` | — |

## Validaciones del registro

Son las mismas que aplica el backend (`RegistroDto`), para que el usuario vea los errores antes de enviar:

| Campo | Regla |
|---|---|
| Nombre / Apellido | Obligatorio, 2 a 50 caracteres, solo letras (con tildes y ñ), espacios, `'` y `-` |
| Correo | Obligatorio, formato válido, máximo 100 caracteres; se envía en minúsculas |
| Nombre de usuario | 3 a 20 caracteres: letras, números, `.` y `_`, sin espacios |
| Contraseña | 8 a 64 caracteres, al menos una mayúscula y un número |
| Repetir contraseña | Obligatorio e igual a la contraseña |
| Fecha de nacimiento | Obligatoria, no puede ser futura ni anterior a 1900 |
| Descripción | Opcional, máximo 280 caracteres |
| Perfil | `usuario` (por defecto) o `administrador` |
| Imagen de perfil | Opcional, JPG/PNG/WEBP, máximo 2 MB, con vista previa. Se envía como data URL en base64 y el back la guarda en Supabase Storage |

En el login se pide correo o nombre de usuario (máximo 100 caracteres) y una contraseña con el mismo formato que en el registro.

## Decisiones de diseño

- Sin librerías de UI: estilos propios en `styles.css` con variables CSS, reutilizados por todas las pantallas.
- Nada de `alert()`: todos los mensajes pasan por `ModalService` y el componente `Modal`.
- Los mensajes de error del backend (`message` de Nest, string o array) se muestran tal cual en el modal (`utils/mensaje-error.ts`).
