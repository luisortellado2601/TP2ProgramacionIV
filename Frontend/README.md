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

## PWA

La app es instalable y abre sin conexión (muestra la interfaz; los datos siguen viniendo del back, que no se cachea). Piezas: `public/manifest.webmanifest` (nombre, colores y íconos de NextPlay), `public/icons/` (íconos normales, `maskable` y `apple-touch-icon`), `ngsw-config.json` (qué se cachea, incluidas las tipografías de Google Fonts) y `provideServiceWorker` en `app.config.ts`. El service worker se registra **solo en el build de producción**, no con `ng serve`. Tras un deploy, quien ya visitó el sitio puede ver la versión anterior hasta recargar una o dos veces; si molesta, `SwUpdate` permite avisar de la versión nueva. Para probarlo en local: `npm run build` y servir `dist/nextplay-frontend/browser` con un servidor estático (con reescritura a `index.html`, como `vercel.json`); si queda una versión vieja en caché, desregistrar el worker en DevTools → Application.

## Estructura

```
src/
├── app/
│   ├── componentes/
│   │   ├── cargando/       Pantalla de inicio (`/`): spinner y validación del token con `autorizar`
│   │   ├── login/          Login por correo o nombre de usuario
│   │   ├── registro/       Registro con validaciones por campo
│   │   ├── publicaciones/  Listado paginado, orden por fecha o me gusta, crear y eliminar
│   │   ├── publicacion/    Tarjeta de una publicación (con like y un botón de comentarios con su cantidad, que despliega los 3 más recientes; "Ver N más" lleva al detalle)
│   │   ├── publicacion-detalle/  Página de una publicación (en grande) con sus comentarios
│   │   ├── nueva-publicacion/  Formulario de alta con imagen opcional
│   │   ├── comentarios/    Comentarios de una publicación (más recientes primero); en modo interactivo: comentar, "cargar más" y editar los propios
│   │   ├── mi-perfil/      Datos del usuario, sus últimas 3 publicaciones y comentarios
│   │   ├── admin-usuarios/ Listado de usuarios para administradores: habilitar y deshabilitar
│   │   ├── admin-alta-usuario/  Alta de usuarios para administradores (mismos datos que el registro, perfil con radios)
│   │   ├── admin-estadisticas/  Dashboard de estadísticas para administradores: lapso con Desde/Hasta (se aplican solos) y 3 gráficos (barras, líneas, torta)
│   │   ├── grafico/        Envoltorio de Chart.js (canvas) que usa el dashboard
│   │   ├── spinner/        Indicador de carga único (`app-spinner`), usado en todas las pantallas que esperan datos
│   │   ├── navbar/         Navegación y cierre de sesión (enlaces a Usuarios y Estadísticas solo para administradores)
│   │   └── modal/          Modal global de éxito / error / confirmación (reemplaza alert())
│   ├── guards/             authGuard (requiere sesión), guestGuard (solo sin sesión) y adminGuard (solo administradores)
│   ├── directives/         Directivas propias: `*appSoloAdmin` (muestra el elemento solo a administradores), `appPastillaPerfil` (clase de color de la pastilla según el perfil: administrador o usuario) y `appContadorCaracteres` (contador "n / máx" en campos de texto: amarillo desde el 90 %, rojo con "¡Límite alcanzado!" al completarlo)
│   ├── pipes/              Pipes propias: `iniciales` (iniciales para el avatar), `estadoUsuario` (clase CSS según habilitado) y `tiempoRelativo` ("hace 5 min", en publicaciones y comentarios)
│   ├── interceptors/       authInterceptor: agrega el token Bearer y, ante un 401, cierra la sesión y va al login
│   ├── models/             Interfaces de usuario, sesión y payloads
│   ├── services/           AuthService (sesión en localStorage, `autorizar`, `refrescar`, aviso de sesión por vencer y cierre automático al vencer), ModalService, PublicacionesService, ComentariosService, UsuariosService y EstadisticasService (rutas de administrador)
│   ├── utils/              Validadores propios, helper de mensajes de error, decodificar JWT y formatear duración
│   ├── app.routes.ts       Rutas con lazy loading
│   └── app.config.ts       Providers (router, HttpClient con el interceptor)
├── environments/           URL de la API por entorno
└── styles.css              Sistema de diseño global (variables, formularios, botones)
```

## Rutas

| Ruta | Componente | Acceso |
|---|---|---|
| `/` | Cargando (valida el token y redirige) | — |
| `/login` | Login | Solo sin sesión |
| `/registro` | Registro | Solo sin sesión |
| `/publicaciones` | Publicaciones | Requiere sesión |
| `/publicaciones/:id` | Detalle de una publicación y sus comentarios | Requiere sesión |
| `/perfil` | Mi perfil | Requiere sesión |
| `/admin/usuarios` | Listado de usuarios (habilitar / deshabilitar) | Solo administradores |
| `/admin/usuarios/nuevo` | Alta de usuario | Solo administradores |
| `/admin/estadisticas` | Dashboard de estadísticas | Solo administradores |
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

- Sin librerías de UI (la única dependencia extra es Chart.js, para los gráficos de estadísticas): estilos propios en `styles.css` con variables CSS, reutilizados por todas las pantallas.
- Nada de `alert()`: todos los mensajes pasan por `ModalService` y el componente `Modal`. Un modal puede ser `persistente` (no se cierra al hacer clic afuera): lo usa el aviso de sesión por vencer.
- Los mensajes de error del backend (`message` de Nest, string o array) se muestran tal cual en el modal (`utils/mensaje-error.ts`).
