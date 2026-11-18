# NextPlay

Red social de videojuegos: publicar reseñas, dar me gusta, comentar y encontrar compañeros de juego. TP #2 de Programación IV (UTN Avellaneda, Tecnicatura Universitaria en Programación).

- **Front:** https://nextplaygaming.vercel.app
- **Back:** https://nextplay-delta.vercel.app

## Estado

Sprints #1 a #4 completos y en producción. Pendiente: pasada final de diseño. Los Sprints #5 y #6 quedan fuera por ahora.

Extra fuera de los sprints: búsqueda de compañeros de juego (`/companeros` en el front, módulo `busquedas` en el back).

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Angular 22, Chart.js, PWA |
| Backend | NestJS 12, Mongoose |
| Base de datos | MongoDB Atlas |
| Imágenes | Supabase Storage |
| Sesión | JWT |

## Estructura

```
TP2PrograIV/
├── Frontend/        Angular (ver Frontend/README.md)
├── Backend/         NestJS (README.md con enunciado, sprints y estado)
│   ├── Funcional.md   Descripción funcional
│   └── postman/       Colecciones y environments
```

## Cómo levantarlo

Backend (requiere `Backend/.env` a partir de `.env.example`):

```bash
cd Backend
npm install
npm run start:dev    # http://localhost:3000
```

Frontend:

```bash
cd Frontend
npm install
npm start            # http://localhost:4200
```

## Tests

```bash
cd Backend && npm test
cd Frontend && npm test
```

## Documentación

- [Backend/README.md](Backend/README.md): fuente de verdad del proyecto (enunciado, sprints, estado actual, decisiones).
- [Frontend/README.md](Frontend/README.md): estructura, rutas, validaciones y diseño del front.
- [Backend/Funcional.md](Backend/Funcional.md): descripción funcional.

## Estudio: sesión, token, interceptor y modal

### Flujo

1. `POST /auth/login` o `/auth/registro` → el back firma un JWT y responde `{ usuario, token }`.
2. `AuthService.guardarSesion()` guarda esa respuesta en `localStorage`, anota cuándo se recibió el token y programa dos temporizadores.
3. El interceptor agrega `Authorization: Bearer <token>` a cada request a la API.
4. El guard global del back verifica el token y que el usuario siga habilitado.
5. A un tercio de la vida del token aparece el modal "Sesión por vencer". Si se acepta, el front llama a `POST /auth/refrescar` (`AuthController.refrescar` → `AuthService.refrescar`) y recibe un token nuevo.
6. Si el back responde 401 (token vencido, inválido o usuario deshabilitado), el interceptor cierra la sesión, muestra un modal y redirige a `/login`.

### Backend (`Backend/src/auth/`)

| Archivo | Función |
|---|---|
| `auth.module.ts` | Configura `JwtModule` (global) con `JWT_SECRET` y `JWT_EXPIRES_IN_SEGUNDOS` (defecto 900). Usa `Number(...)` porque la variable llega como texto. |
| `auth.service.ts` | `login`/`registro`/`refrescar` devuelven usuario + token (`construirRespuesta`). `autorizar` solo valida y devuelve el usuario. `obtenerVigenteOFallar` lanza 401 si el usuario no existe o está deshabilitado. |
| `auth.controller.ts` | `registro` y `login` son `@Public()`. `autorizar` y `refrescar` exigen token. |
| `jwt-auth.guard.ts` | Guard global (`APP_GUARD`). Rutas `@Public()` pasan. El resto: extrae el Bearer, `verifyAsync` (detecta vencimiento), consulta en BD que el usuario exista y esté habilitado, y deja el payload en `request.usuario`. |
| `decoradores/public.decorator.ts` | `@Public()` marca las rutas que se saltan el guard. |

El payload del JWT lleva `sub`, `correo`, `nombreUsuario`, `perfil`, `iat` y `exp`.

### Frontend

| Archivo | Función |
|---|---|
| `interceptors/auth-interceptor.ts` | Agrega el Bearer a requests de la API. Ante un 401 en ruta no pública y con token: `logout()`, modal ("Sesión expirada" o "Usuario deshabilitado") y navegación a `/login`. Devuelve `EMPTY` para cortar el flujo. Compara `obtenerToken() === token` para no repetir el cierre si fallan varias requests a la vez. Login/registro se excluyen porque ahí un 401 es "contraseña incorrecta". |
| `services/auth.ts` | Sesión en un `signal` + `localStorage`. Programa el aviso y el vencimiento, abre el modal de confirmación y llama a `refrescar()`. |
| `services/modal.ts` | Un único `signal<EstadoModal \| null>`. `exito()`, `error()`, `confirmar()` lo llenan; `cerrar()` lo vacía. `persistente` evita cerrarlo con clic en el fondo. |
| `componentes/modal/` | Se monta una sola vez en `app.html` (`<app-modal />`) y dibuja lo que diga el signal. |
| `utils/jwt.ts` | Decodifica el payload del token (base64url a JSON, sin la clave). |
| `utils/formatear-duracion.ts` | Muestra "X segundos/minutos" en el aviso. |
| `componentes/cargando/` | Al arrancar con sesión guardada llama a `autorizar()` para validarla. |

### Persistencia al recargar

En `localStorage` se guardan dos claves:

- `nextplay_sesion`: la respuesta completa del back (`{ usuario, token }`) como JSON. El payload no se guarda aparte: viene dentro del token y se decodifica cuando hace falta.
- `nextplay_token_recibido`: marca de tiempo de cuándo llegó el token.

Al recargar, `AuthService` inicializa el signal desde `localStorage` y su constructor reprograma los temporizadores con `leerTokenRecibido`. Luego la pantalla Cargando llama a `autorizar()` y, si el back responde 401, el interceptor cierra la sesión.

### Cambiar los tiempos

- **Duración del token:** variable de entorno `JWT_EXPIRES_IN_SEGUNDOS` del back, en segundos (`Backend/.env` en local, variables del hosting en producción). Hay que reiniciar el back. Solo afecta a tokens nuevos.
- **Momento del aviso:** `services/auth.ts`, en `iniciarContadorSesion`: `duracionMs / 3`. Se calcula con `exp - iat` del token, así que se adapta solo a cualquier duración. Para avisar a la mitad: `duracionMs / 2`.
- **Otros tiempos del front:** `DURACION_ARRANQUE_MS` y `DURACION_REDUCIDA_MS` (`cargando.ts`, animación de arranque), `REVISION_CADA_MS` y `REINTENTO_SI_HAY_MODAL_MS` (`actualizacion.ts`, aviso de versión nueva de la PWA).

### Conceptos para explicar

- El front no decide por sí solo que el token venció: lo decide el back con el 401. El temporizador solo avisa antes y ofrece renovar.
- El guard consulta la BD en cada request, por eso un usuario deshabilitado pierde el acceso al instante aunque su token siga vigente.
- El payload es legible por cualquiera, pero no se puede falsificar sin `JWT_SECRET`.
- `autorizar` no cambia el token ni los temporizadores; `refrescar` emite un token nuevo y los reinicia.
