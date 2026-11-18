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

La app es instalable y abre sin conexión (muestra la interfaz; los datos siguen viniendo del back, que no se cachea). Piezas: `public/manifest.webmanifest` (nombre, colores y íconos de NextPlay), `public/icons/` (íconos normales, `maskable` y `apple-touch-icon`), `ngsw-config.json` (qué se cachea, incluidas las tipografías de Google Fonts) y `provideServiceWorker` en `app.config.ts`. El service worker se registra **solo en el build de producción**, no con `ng serve`. Tras un deploy, `ActualizacionService` (usa `SwUpdate`) avisa con un modal "Versión nueva" con los botones *Actualizar* (recarga) y *Más tarde*; busca versiones al volver a la pestaña y cada hora, no pisa otro modal abierto (como el de sesión por vencer) y reintenta si se elige *Más tarde*. Solo funciona en el build de producción, y lo reciben las personas cuya versión instalada ya incluye este servicio (la primera vez hay que recargar una o dos veces). Para probarlo en local: `npm run build` y servir `dist/nextplay-frontend/browser` con un servidor estático (con reescritura a `index.html`, como `vercel.json`); si queda una versión vieja en caché, desregistrar el worker en DevTools → Application.

## Estructura

```
src/
├── app/
│   ├── componentes/
│   │   ├── cargando/       Pantalla de arranque (`/`): secuencia animada y validación del token con `autorizar`
│   │   ├── login/          Login por correo o nombre de usuario
│   │   ├── registro/       Registro con validaciones por campo
│   │   ├── publicaciones/  Listado paginado, orden por fecha o me gusta, crear y eliminar
│   │   ├── publicacion/    Tarjeta de una publicación (con like y un botón de comentarios con su cantidad, que despliega los 3 más recientes; "Ver N más" lleva al detalle)
│   │   ├── publicacion-detalle/  Página de una publicación (en grande) con sus comentarios
│   │   ├── companeros/     Búsqueda de compañeros: buscador por juego, región y plataforma (con botón Buscar), listado paginado, contacto con quien publicó y formulario para publicar la propia búsqueda
│   │   ├── juegos-destacados/  Deslizable con las carátulas de los juegos populares (arriba del listado de publicaciones)
│   │   ├── juego-detalle/  Ficha de un juego: banner, sinopsis, plataformas, peso, géneros, desarrollador y año
│   │   ├── nueva-publicacion/  Formulario de alta con imagen opcional
│   │   ├── comentarios/    Comentarios de una publicación (más recientes primero); en modo interactivo: comentar, "cargar más" y editar los propios
│   │   ├── mi-perfil/      Datos del usuario (con fecha de nacimiento), sus últimas 3 publicaciones y comentarios
│   │   ├── editar-perfil/  Formulario para editar el propio perfil (nombre, apellido, fecha de nacimiento, descripción y foto; correo y usuario solo se muestran)
│   │   ├── admin-usuarios/ Listado de usuarios para administradores: habilitar y deshabilitar
│   │   ├── admin-alta-usuario/  Alta de usuarios para administradores (mismos datos que el registro, perfil con radios)
│   │   ├── admin-estadisticas/  Dashboard de estadísticas para administradores: lapso con Desde/Hasta (se aplican solos) y 3 gráficos (barras, líneas, torta)
│   │   ├── grafico/        Envoltorio de Chart.js (canvas) que usa el dashboard
│   │   ├── spinner/        Indicador de carga único (`app-spinner`), usado en todas las pantallas que esperan datos
│   │   ├── navbar/         Marca, navegación (barra fija en escritorio, cajón deslizable en celular), interruptor de tema y cierre de sesión (enlaces a Usuarios y Estadísticas solo para administradores)
│   │   └── modal/          Modal global de éxito / error / confirmación (reemplaza alert()); la confirmación admite textos de botón propios
│   ├── data/               Catálogo local de juegos populares (`juegos.ts`); no usa el backend ni Mongo
│   ├── guards/             authGuard (requiere sesión), guestGuard (solo sin sesión) y adminGuard (solo administradores)
│   ├── directives/         Directivas propias: `*appSoloAdmin` (muestra el elemento solo a administradores), `appPastillaPerfil` (clase de color de la pastilla según el perfil: administrador o usuario) y `appContadorCaracteres` (contador "n / máx" en campos de texto: amarillo desde el 90 %, rojo con "¡Límite alcanzado!" al completarlo)
│   ├── pipes/              Pipes propias: `iniciales` (iniciales para el avatar), `estadoUsuario` (clase CSS según habilitado) y `tiempoRelativo` ("hace 5 min", en publicaciones y comentarios)
│   ├── interceptors/       authInterceptor: agrega el token Bearer solo a la API y, ante un 401 en rutas protegidas, cierra la sesión una sola vez, avisa y va al login
│   ├── models/             Interfaces de usuario, sesión y payloads
│   ├── services/           AuthService (sesión en localStorage, `autorizar`, `refrescar`, aviso de sesión por vencer con dos temporizadores: al vencer solo cierra el aviso, la sesión se cierra en el siguiente 401), ModalService, PublicacionesService, ComentariosService, UsuariosService, EstadisticasService (rutas de administrador), JuegosService (catálogo local e imágenes), TemaService (modo claro/oscuro) y ActualizacionService (aviso de versión nueva del PWA)
│   ├── utils/              Validadores propios, helper de mensajes de error, decodificar JWT, formatear duración y marca de la secuencia de arranque (`arranque.ts`)
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
| `/companeros` | Búsqueda de compañeros de juego: filtros, listado y publicar una búsqueda | Requiere sesión |
| `/juegos/:id` | Ficha de un juego popular (ej. `/juegos/elden-ring`) | Requiere sesión |
| `/perfil` | Mi perfil | Requiere sesión |
| `/perfil/editar` | Editar mi perfil | Requiere sesión |
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

## Diseño visual

Rediseño en curso, por bloques. Hecho: sistema visual con modo oscuro y claro, marca y navegación, pantalla de arranque, juegos populares y aviso de versión nueva. Pendiente: feed y tarjetas, login/registro/perfil, admin y reacciones con ráfaga.

- **Dos temas:** el oscuro es negro con neón estilo Cyberpunk (amarillo, cian y magenta, con brillo en los botones); el claro es "papel e impresión" (fondo blanco frío, contornos de tinta gruesos y botones con relieve duro). Se elige con el botón de la barra, se recuerda en `localStorage` (`nextplay_tema`) y por defecto sigue la preferencia del sistema. `TemaService` pone `data-tema="oscuro|claro"` en `<html>`, y un script en `index.html` lo hace antes de pintar para evitar el parpadeo.
- **Tokens:** todo el color sale de variables semánticas definidas por tema en `styles.css` (`--color-bg`, `--color-surface`, `--color-text`, `--color-primary`, `--color-hud`, `--color-line-strong`...). Los componentes no deberían usar colores sueltos. Los gráficos (Chart.js dibuja en canvas) leen `--grafico-1..8` y los colores de texto y línea del tema activo, y se redibujan al cambiarlo.
- **Tipografías:** Goldman (logo y pantalla de arranque), Oxanium (menú, botones, títulos y títulos de publicaciones) y Hanken Grotesk (texto).
- **Fondo:** patrón de glifos neón (`--fondo-patron`, un SVG en línea distinto por tema, sin peticiones de red).
- **Paneles:** `.card`, el modal y `.panel-imagen` (carátulas) tienen dos esquinas cortadas con `clip-path`; las diagonales se dibujan con degradés a una distancia `--corte × 0,7071` de la esquina, y la de arriba usa `--color-hud`. No llevan sombra ni contorno de foco externo, porque `clip-path` los recorta: el foco de las tarjetas va hacia adentro.
- **Botones:** teclas con relieve inferior que se hunden al presionar. Los títulos de pantalla (`h2` y `.titulo-marca`) van en mayúsculas e inclinados.
- **Navegación:** en pantallas de 960 px o más, barra fija con los enlaces, el usuario y *Salir* (todos con el mismo estilo plano); en celular, botón de menú y cajón deslizable. La marca (un mando de consola en una caja de esquinas cortadas, más el nombre) está en `navbar.html` y en `public/favicon.svg`; los PNG de `public/icons/` se generaron a partir de ese mismo logo.
- **Spinner:** un mando de consola de un solo color que late (se agranda, se achica y brilla), con los cuatro botones encendiéndose en secuencia. Con movimiento reducido solo cambia la opacidad.
- **Pantalla de arranque (`cargando`):** una secuencia de unos 2,6 s (los cuatro símbolos, el logo letra por letra y una barra de carga). Se muestra una vez por sesión del navegador y en cada inicio de sesión (el login limpia la marca con `reiniciarArranque()` y pasa por `/`). Con sesión saluda al usuario y entra sola a `/publicaciones`; sin sesión espera un toque. Un toque la saltea. Con movimiento reducido se ve el estado final sin animar.
- **Juegos populares:** los datos viven en `src/app/data/juegos.ts` (id, título, desarrollador, año, géneros, plataformas, peso, sinopsis y la imagen: `steamAppId` o una URL en `portada`). Desarrollador, año, géneros y peso de los juegos de Steam salen de su ficha pública; los de Fortnite, League of Legends y Valorant, de fuentes de terceros, y su peso varía con las actualizaciones. El peso es aproximado y de la versión de PC; las sinopsis están redactadas para NextPlay. Las imágenes se piden a sus CDN (Steam, Riot y fortnite-api.com) sin guardarlas en el proyecto: si no cargan se ocultan y la tarjeta sigue mostrando el título. Para sumar un juego alcanza con agregar un objeto a `JUEGOS`.
- **Deslizable de juegos:** avanza solo de a una tarjeta cada 3,5 s y vuelve al principio al llegar al final. No tiene botón de pausa: se detiene al pasar el mouse, al enfocar con el teclado o al tocarlo, y retoma a los 8 s sin actividad. Con movimiento reducido no avanza solo. Está arriba del feed y al pie de la tarjeta del perfil.
- **Galería del juego:** dentro de la tarjeta de cada ficha hay un carrusel de capturas (`capturas` en `juegos.ts`; las de Steam salen de su ficha pública) que avanza solo cada 4,5 s, se detiene al pasar el mouse, enfocar o tocar (retoma a los 9 s) y se desliza con el dedo, con flechas y con puntos. Con movimiento reducido no avanza solo.
- **Perfil:** tarjeta con avatar grande en marco de esquinas cortadas, rol, datos de la cuenta y el deslizable de juegos al pie.
- **Reacciones:** al dar me gusta, cuatro símbolos (▲ ● ✕ ■) salen disparados del corazón y se desvanecen; al quitarlo no hay ráfaga.
- **Compañeros:** consume `GET/POST /busquedas`, `POST /busquedas/:id/respuestas` y `DELETE /busquedas/:id` del back (`BusquedasService`). Una búsqueda tiene solo juego, región y plataforma, que se muestran como cuadritos en la tarjeta. Las regiones y plataformas son listas fijas (`models/busqueda.ts`), iguales a las que valida el back, y los juegos salen del catálogo local. El buscador se aplica con el botón *Buscar* y se oculta mientras se publica una búsqueda. Cada tarjeta tiene *Contactar (n)*, que despliega los mensajes y una caja para escribirle a quien publicó. Quien publicó (o un administrador) puede cerrar la búsqueda.
