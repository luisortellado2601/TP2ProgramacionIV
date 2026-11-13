# TP #2 – Red Social
**Materia:** Programación IV (UTN Avellaneda – Tecnicatura Universitaria en Programación)
**Nivel:** 4º Cuatrimestre
**Tipo de examen:** Trabajo Práctico – corresponde al Segundo Parcial
**Modalidad de corrección:** por sprint, de una semana cada uno.

> **Alcance actual:** Sprints #1 a #4. El Sprint #5 (Recuperatorio) y el Sprint #6 (Final) quedan fuera por ahora y se agregarán más adelante.

> Este documento es la fuente de verdad del proyecto. Claude Code debe leerlo al inicio de cada sesión, revisar la sección **"0. Estado actual"** y continuar desde **"Próximo paso"**. Al terminar cada tarea, actualizar los checkboxes de la sección 0 y de los sprints.

---

## 0. Estado actual (ACTUALIZAR EN CADA SESIÓN)

**Última actualización:** 2026-11-13
**Sprint en curso:** #4. Back terminado, deployado y probado con Postman contra Producción (back 45 tests, front 54). Front: baja de publicaciones para admin y dashboard de usuarios (listado, alta con radios, habilitar/deshabilitar) listos. 3 pipes propias (`iniciales`, `estadoUsuario`, `tiempoRelativo`) y 3 directivas propias (`appSoloAdmin`, `appPastillaPerfil`, `appContadorCaracteres`) listas. Dashboard de estadísticas listo (Chart.js: barras, líneas y torta; lapso con Desde/Hasta que se aplican solos). PWA lista (manifest, íconos propios y service worker; probada sobre el build: instalable y abre sin conexión). Spinner único (`app-spinner`) en todas las cargas. Pendiente: verificar la instalación en producción tras el deploy.

### Progreso por sprint
| Sprint | Front | Back | Estado |
|---|---|---|---|
| #1 Registro/Login base | [x] | [x] | Cerrado y deployado |
| #2 Publicaciones y Mi Perfil | [x] | [x] | Cerrado y deployado |
| #3 Comentarios, JWT y sesión | [x] | [x] | Cerrado y deployado |
| #4 Admin, estadísticas, PWA, pipes/directivas | [x] | [x] | Back deployado; front completo, falta deployarlo y verificar la PWA en producción |

### Próximo paso
Deployar el front y comprobar la PWA en producción (abrir `/ngsw-worker.js` y `/manifest.webmanifest`, instalar la app, abrirla sin conexión). Después, pasada final de diseño (casilla "Diseño uniforme" de la sección 5) y cerrar el Sprint #4.

### Cómo probar
- **Tests:** `npm test` en `Backend/` y en `Frontend/`.
- **Postman** (`Backend/postman/`): una colección de 13 requests y dos environments, **NextPlay - Local** (`localhost:3000`) y **NextPlay - Produccion** (back de Vercel). Cada request hace el pedido principal y dispara en sus tests las variantes (400, 401, 403, 404, 409), que aparecen como "caso -> status esperado". Se corre entera en orden con "Run collection". El request 13 (token vencido) solo corre si el token dura 120 s o menos; con 900 se omite solo. La carpeta "Pruebas rapidas (manual)" sirve para probar a mano (likes, etc.) con un único token, `{{tokenActivo}}`, que se cambia con "Usar usuario: autor/otro".
- **Sprint #4 (back):** `NextPlay.Sprint4.postman_collection.json`, colección aparte de 34 requests (usuarios y estadísticas de admin). Es independiente de la anterior (crea sus propios usuarios y publicación), usa los mismos environments y se corre entera en orden con "Run collection".
- Las pruebas crean usuarios y publicaciones de prueba en la base real (no hay endpoint para borrarlos).

### Entorno y producción
- Front: https://nextplaygaming.vercel.app · Back: https://nextplay-delta.vercel.app. Son dos proyectos de Vercel del mismo repo; cada push a `master` redeploya ambos.
- `Backend/.env` apunta a Atlas real (base `test`); nunca se usó un Mongo local. Si cambia la contraseña de Atlas, actualizarla también en `MONGODB_URI` del proyecto Backend en Vercel (production y preview), o el back falla con `FUNCTION_INVOCATION_FAILED`.
- En Windows, `nest start --watch` puede dejar procesos `node` colgados en el puerto 3000 (`EADDRINUSE`). Buscar el PID con `Get-NetTCPConnection -LocalPort 3000` y matarlo con `Stop-Process`.

### Decisiones vigentes
- **Sesión:** el token dura `JWT_EXPIRES_IN_SEGUNDOS` (900 por defecto, que es lo que pide el enunciado). El front decodifica el JWT y avisa cuando queda un tercio de su vida (a los 10 min con 900 s), con un modal que no se cierra al hacer clic afuera. Si se ignora, la sesión se cierra sola al vencer el token.
- **401** en una ruta protegida: el interceptor cierra la sesión, muestra "Sesión expirada" y manda a `/login`. En login y registro el 401 significa credenciales incorrectas y lo muestra la propia pantalla.
- Sin bcrypt ni Multer (no vistos en la cursada): hash con `PasswordHasher` (`node:crypto`) e imágenes en base64 subidas a Supabase Storage.
- Backend en ESM: los imports relativos terminan en `.js`.

### Pendientes y límites conocidos
- `JwtAuthGuard` solo verifica firma y vencimiento, así que un usuario deshabilitado conserva acceso a las rutas comunes hasta que venza su token (15 min). Las rutas de administrador (`@Roles`) sí consultan la base en cada pedido, y `autorizar`/`refrescar` también.
- Las estadísticas agrupan y filtran los días en UTC (el enunciado no pide zona horaria).
- En el dashboard, las barras (publicaciones por usuario) y la torta (comentarios por publicación) muestran solo el top 10: el front no manda `limit` y el back usa 10 por defecto (acepta hasta 50). Sin fechas elegidas se muestra todo el histórico vigente.
- `authGuard` del front solo mira `localStorage`; un token vencido se detecta en el primer pedido (401) o al iniciar la app en `/` (pantalla "Cargando").
- Menor: en `darLike`/`quitarLike`, si la publicación se elimina justo entre la comprobación y la actualización, responde 409 en vez de 404.
- Opcional: definir `CORS_ORIGIN` en el back de Vercel (`https://nextplaygaming.vercel.app`) y borrar la variable vieja `JWT_EXPIRES_IN_MINUTOS`, si existe.
- Detalle técnico y decisiones: [`../GUIA_TECNICA.md`](../GUIA_TECNICA.md).

---

## Estructura del repositorio y cómo levantarlo

```
TP2PrograIV/
├── Frontend/   Angular 22 (NextPlay) – componentes en src/app/componentes, servicios, guards
└── Backend/    NestJS 12 + Mongoose – módulos auth, usuarios, publicaciones, comentarios, estadisticas
    ├── Funcional.md   Descripción funcional de NextPlay
    └── postman/       Dos colecciones de Postman (Sprint 1-3: 13 requests; Sprint 4: 34) y environments Local y Produccion
```

**Backend** (requiere `Backend/.env` a partir de `.env.example`: `MONGODB_URI`, `PORT`, `JWT_SECRET`, `JWT_EXPIRES_IN_SEGUNDOS`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_BUCKET`):
```bash
cd Backend && npm install && npm run start:dev   # http://localhost:3000
```

**Frontend:**
```bash
cd Frontend && npm install && npm start          # http://localhost:4200
```

---

## 1. Descripción general

La "Red social" es una aplicación dividida en **dos proyectos** (frontend y backend), que conviven en este repositorio en las carpetas `Frontend/` y `Backend/`. Los usuarios pueden hacer publicaciones, reaccionar ("Me gusta") y comentarlas. Cada usuario puede ver y editar su perfil. Solo se accede estando registrado y logueado.

### Stack obligatorio
1. Frontend: **Angular**.
2. Backend: **NestJS**.
3. Base de datos: **MongoDB**.
4. Autenticación: login y registro contra el servidor Nest propio, con **JWT**.

### Reglas transversales
- **Status HTTP correctos**: 400 Bad Request, 401 Unauthorized, 201 Created, etc. Prohibido devolver 200 en errores o 400 en respuestas correctas.
- **Diseño trabajado y uniforme** en todas las pantallas. No HTML plano.
- **No usar `alert()`**: usar **modales**.
- Navegación entre pantallas.
- Mensajes e información clara y completa al mostrar mensajes o realizar acciones.
- Publicaciones: **título, mensaje e imagen opcional**; permiten "Me gusta" y comentarios.
- Solo se accede a la app estando registrado o logueado (guards de rutas).
- Bajas lógicas (no borrar físicamente publicaciones ni usuarios).

---

## 2. Modelo de datos sugerido (MongoDB)

- **Usuario**: nombre, apellido, correo (único), nombreUsuario (único), contraseña (hash), fechaNacimiento, descripcion, imagenPerfilUrl, perfil (`usuario` | `administrador`, default `usuario`), habilitado (bool, default true), fechaAlta.
- **Publicación**: titulo, mensaje, imagenUrl (opcional), usuario (ref), fecha, likes (array de userIds), eliminada (bool, baja lógica).
- **Comentario**: publicacion (ref), usuario (ref), mensaje, fecha, modificado (bool, default false), eliminado (bool).

> Es una sugerencia: ajustar si hace falta, y documentar cambios en la sección 0.

---

## 3. Sprints

### SPRINT #1 – Base, registro y login

**Front**
- [x] Crear proyecto Angular.
- [x] Pantallas: Registro, Login, Publicaciones, MiPerfil. _(Publicaciones y MiPerfil son esqueletos navegables; el contenido real es Sprint #2.)_
- [x] Deploy en hosting: https://nextplaygaming.vercel.app (Vercel, `Frontend/vercel.json`).
- [x] Navegación entre componentes (sin límites de accesibilidad por ahora).
- [x] Favicon propio.
- [x] **Componente Login**
  - [x] Formulario con validaciones y mensajes acordes.
  - [x] Login por correo **o** nombre de usuario (el elegido debe ser único en la base de datos).
  - [x] Contraseña: mínimo 8 caracteres, una mayúscula y un número.
- [x] **Componente Registro**
  - [x] Formulario con validaciones y mensajes acordes.
  - [x] Campos: nombre, apellido, correo, nombre de usuario, contraseña, repetir contraseña, fecha de nacimiento, descripción breve.
  - [x] Campo `file` para imagen de perfil (opcional; JPG/PNG/WEBP hasta 2 MB, con vista previa). Se envía al back como data URL en base64.
  - [x] Atributo `perfil`: por defecto "usuario", modificable a "administrador". _(Requirió agregar el campo al `RegistroDto`/`AuthService` del back, que no lo aceptaba.)_

**Back**
- [x] Crear proyecto NestJS.
- [x] Módulos: Publicaciones, Autenticación, Usuarios. _(Publicaciones: solo esquema + módulo creados, el controller/service es Sprint #2. Usuarios sigue siendo el módulo de prueba.)_
- [x] **Módulo Autenticación**
  - [x] Ruta registro (**POST** `/auth/registro`): recibe todos los datos, los valida (class-validator) y guarda en la BD.
    - [x] Contraseña hasheada con `PasswordHasher` propio (`node:crypto`, scrypt + salt), **no bcrypt**.
    - [x] Imagen de perfil: el back valida tipo y tamaño, la sube a **Supabase Storage** (bucket público `imagenes-perfil`, carpeta `perfiles/`) con `AlmacenamientoService` (API REST con `fetch`, sin Multer ni SDK) y guarda la URL pública en `imagenPerfilUrl`. Límite del body JSON subido a 3 MB en `main.ts`.
  - [x] Ruta login (**POST** `/auth/login`): recibe usuario/correo y contraseña sin encriptar.
    - [x] Verifica la contraseña con `PasswordHasher` para confirmar el login.
    - [x] Devuelve todos los datos del usuario + JWT (expira a los 15 min).

> Probado manualmente: registro (201), registro duplicado por correo (409), password débil (400), login por correo y por nombre de usuario (200), login con contraseña incorrecta (401). Estos casos están en `Backend/postman/NextPlay.postman_collection.json`.

**Ajustes para cerrar el sprint** (surgen de la revisión del 2026-10-25, ver sección 0)
- [x] Normalizar correo a minúsculas (DTO + `lowercase: true` en el esquema + búsqueda en minúsculas en el login).
- [x] Validar que la fecha de nacimiento no sea futura ni anterior a 1900 (front y back).
- [x] Validaciones por campo, idénticas en front (`Registro`/`Login`) y back (`RegistroDto`/`LoginDto`): ver tabla en `Frontend/README.md`.
- [x] `lang="es"` en `index.html`.
- [x] README del front actualizado.
- [x] Campo `file` de imagen de perfil (front + back con Supabase Storage). Probado: GIF → 400, imagen > 2 MB → 400, PNG válido → 201 con URL pública accesible.
- [x] CORS del back configurable con la variable `CORS_ORIGIN` (sin definir acepta cualquier origen; en producción se define con el dominio del front).
- [x] `Frontend/vercel.json` creado (build de Angular + redirección de todas las rutas a `index.html`).
- [x] `apiUrl` de producción en `Frontend/src/environments/environment.ts` (`https://nextplay-delta.vercel.app`, el back ya desplegado en Vercel).

**Plan de trabajo diario sugerido**
| Día | Tareas |
|---|---|
| 1 | Crear proyectos Angular y Nest; conectar MongoDB; estructura de módulos; favicon; layout base y estilos globales. |
| 2 | Back: esquema Usuario, `POST /auth/registro` con validaciones (class-validator), hash de contraseña con `PasswordHasher` propio. Sin subida de imagen por ahora (se pospone a Supabase). |
| 3 | Back: `POST /auth/login` (usuario o correo), status codes correctos, manejo de errores. Probar con Postman/Thunder. |
| 4 | Front: pantalla Registro (reactive forms, validaciones, file input) y Login con modales de error/éxito. |
| 5 | Front: pantallas Publicaciones y MiPerfil (esqueleto), routing, navegación. Integración front↔back. |
| 6 | Deploy del front en hosting (y back si corresponde), revisión de checklist, correcciones. |

---

### SPRINT #2 – Publicaciones y Mi Perfil

**Front**
- [x] **Página Publicaciones**
  - [x] Listado ordenado por fecha por defecto.
  - [x] Permitir ordenar por cantidad de "me gusta".
  - [x] Traer cantidad limitada de publicaciones, con paginación.
  - [x] Cada publicación es un **componente**.
  - [x] Dar y quitar "me gusta" siempre que corresponda.
  - [x] Poder eliminar mis propias publicaciones.
  - [x] Crear publicación (título, mensaje, imagen opcional).
- [x] **Componente Mi Perfil**
  - [x] Mostrar todos los datos del usuario y su foto de perfil.
  - [x] Mostrar mis últimas 3 publicaciones y sus comentarios. _(Muestra los 3 comentarios más recientes de cada una y un botón para ver los demás.)_

**Back – Publicaciones controller**
- [x] Alta, listado y baja lógica de publicaciones.
- [x] **POST**: guardar publicación relacionada a un usuario (título, descripción, URL de imagen si tiene; la imagen debe guardarse).
- [x] **DELETE**: baja lógica, solo por el creador o un administrador.
- [x] **GET**: listar últimas publicaciones.
  - [x] Parámetro de ordenamiento: por fecha / por cantidad de me gusta.
  - [x] Filtrar posteos de un usuario particular.
  - [x] Parámetros `offset` y `limit` para paginar.
- [x] **POST** (like): un usuario da me gusta a una publicación; **un solo me gusta por usuario por publicación**.
- [x] **DELETE** (like): eliminar me gusta, solo si el usuario lo había dado antes.

> **Nota:** en este sprint el actor viajaba como `usuarioId` (body/query) por falta de JWT. Desde el Sprint #3 sale del token validado y `usuarioId` ya no se acepta (400).

**Plan de trabajo diario sugerido**
| Día | Tareas |
|---|---|
| 1 | Back: esquema Publicación, `POST /publicaciones` con imagen, `GET` con orden/offset/limit/filtro por usuario. |
| 2 | Back: `DELETE` baja lógica (dueño o admin), likes (`POST`/`DELETE`) con regla de un like por usuario. |
| 3 | Front: componente Publicación, listado con orden y paginación, formulario de nueva publicación (modal). |
| 4 | Front: like/unlike, eliminar propia publicación (modal de confirmación). |
| 5 | Front: Mi Perfil (datos + foto + últimas 3 publicaciones con comentarios). Integración y pruebas. |
| 6 | Revisión de checklist y correcciones. |

---

### SPRINT #3 – Comentarios, JWT y manejo de sesión

**Front**
- [x] **Página Publicación** (detalle, `/publicaciones/:id`)
  - [x] Ver la publicación en grande con sus comentarios.
  - [x] Permitir escribir comentarios.
  - [x] Comentarios ordenados uno debajo del otro; primera carga limitada (5); botón **"cargar más"** que trae más sin quitar los anteriores.
  - [x] El autor de un comentario puede editarlo; un comentario editado debe **anunciar que fue editado**.
- [x] **Login y registro**: tomar el token devuelto y guardarlo localmente en el navegador (`AuthService`, `localStorage`); el interceptor lo envía como `Bearer`.
- [x] **Página "Cargando"** (`componentes/cargando/`, ruta `/`)
  - [x] Al iniciar la app, mostrar pantalla de carga con spinner.
  - [x] Validar el token contra la ruta `autorizar`: si es válido → redirigir a Publicaciones; si no → Login.
- [x] **A nivel aplicación**
  - [x] Al iniciar sesión, iniciar un contador. Al faltar un tercio de la vida del token, mostrar **modal** preguntando si desea extender la sesión. Si acepta, **refrescar el token**. _(Implementado como proporción de la duración real del token en vez de fijo en minutos, para que escale con `JWT_EXPIRES_IN_SEGUNDOS`: ver decisión en sección 0.)_
  - [x] Si una petición devuelve **401**, redirigir al login para rehacer el token (interceptor HTTP).

**Back – Comentarios controller**
- [x] Traer comentarios de una publicación, agregar y modificar.
- [x] **POST**: agrega comentario a una publicación con el usuario (del token) y la fecha.
- [x] **PUT** `/comentarios/:id`: modifica el mensaje y agrega `modificado: true`. Solo el autor (403 si no); 404 si no existe, está eliminado o su publicación fue dada de baja.
- [x] **GET**: comentarios de una publicación, paginados, **más recientes primero** (responde `{ total, comentarios }`).

**Back – Módulo Autenticación**
- [x] Login y registro generan **token JWT** con identidad del usuario (id/correo/nombre de usuario) y su **rol**.
- [x] Token devuelto en la respuesta (no por cookies).
- [x] Token vence a los **15 minutos** (configurable con `JWT_EXPIRES_IN_SEGUNDOS`; se puede bajar en el `.env` local para probar el vencimiento).
- [x] **POST `/auth/autorizar`**: valida que el token sea válido y no esté vencido. **401** si hay error; si es válido, devuelve `{ usuario }`.
- [x] **POST `/auth/refrescar`**: valida token; devuelve `{ usuario, token }` con la misma payload y el vencimiento renovado.
- [x] Proteger todas las rutas con guard JWT (`JwtAuthGuard` global; `@Public()` en registro, login y `GET /`).

**Plan de trabajo diario sugerido**
| Día | Tareas |
|---|---|
| 1 | Back: JWT en login/registro (15 min), `JwtAuthGuard`, `POST /auth/autorizar` y `POST /auth/refrescar`. |
| 2 | Back: esquema Comentario, `POST`, `PUT` (modificado:true) y `GET` paginado (recientes primero). |
| 3 | Front: guardar token, servicio de auth, interceptor (agrega token + maneja 401), guard de rutas. |
| 4 | Front: pantalla "Cargando" con spinner + validación de token; contador (aviso a un tercio de la vida del token) con modal de extender sesión + refresh. |
| 5 | Front: página Publicación (detalle), comentarios, "cargar más", edición con leyenda "editado". |
| 6 | Pruebas de punta a punta, revisión de checklist y correcciones. |

---

### SPRINT #4 – Administrador, estadísticas, PWA, pipes y directivas

**Front**
- [x] **Páginas Publicación y Publicaciones**: si el usuario logueado es administrador, habilitar botones para dar de baja **cualquier** publicación (la publicación y sus comentarios dejan de estar disponibles).
- [x] **Página dashboard/usuarios** (solo administradores)
  - [x] Listado de usuarios.
  - [x] Crear nuevos usuarios (mismos datos que el registro) con **dos radio buttons**: "usuario" / "administrador".
  - [x] Alta y baja lógica (habilitar/deshabilitar). Un usuario deshabilitado **no puede ingresar** y es **notificado** al intentar el login.
  - [x] Formulario de registro para nuevos usuarios.
- [x] **Página dashboard/estadísticas** (gráficos de **tipos variados**: torta, barras, líneas, etc.)
  - [x] Cantidad de publicaciones por usuario en un lapso de tiempo (lapso elegible). _(Barras.)_
  - [x] Cantidad de comentarios realizados en un lapso de tiempo (lapso elegible). _(Líneas, por día.)_
  - [x] Cantidad de comentarios en cada publicación en un lapso de tiempo (lapso elegible). _(Torta.)_
- [ ] **A nivel aplicación**
  - [x] Implementar **PWA**. _(`@angular/pwa`: manifest, íconos propios, service worker solo en producción.)_
  - [x] **3 pipes PROPIAS** (`iniciales`, `estadoUsuario`, `tiempoRelativo`).
  - [x] **3 directivas PROPIAS** (`appSoloAdmin`, `appPastillaPerfil`, `appContadorCaracteres`).

**Back – Usuarios controller** (validar que el token sea de administrador)
- [x] `RolesGuard` + decorador `@Roles(...)`: 403 si el perfil no corresponde, 401 si el usuario ya no existe o fue deshabilitado. Lee el perfil de la base, no del token.
- [x] **GET** `/usuarios`: listado de usuarios (sin el hash de la contraseña).
- [x] **POST** `/usuarios`: alta de nuevo usuario con las mismas reglas del registro (`RegistroDto`); `perfil` define administrador/usuario. No devuelve token.
- [x] **DELETE** `/usuarios/:id`: deshabilitar (baja lógica). Un administrador no puede deshabilitarse a sí mismo (400).
- [x] **POST** `/usuarios/:id/habilitar`: alta lógica, rehabilita al usuario.
- [x] Login: bloquea usuarios deshabilitados con 401 y "El usuario se encuentra deshabilitado".

**Back – Estadísticas controller** (validar token de administrador)
- [x] **GET** `/estadisticas/publicaciones-por-usuario` → `[{ usuarioId, nombreUsuario, cantidad }]`.
- [x] **GET** `/estadisticas/comentarios` → `{ total, porDia: [{ fecha, cantidad }] }`.
- [x] **GET** `/estadisticas/comentarios-por-publicacion` → `[{ publicacionId, titulo, cantidad }]`.
- [x] Las tres aceptan `desde` y `hasta` (opcionales; con solo la fecha, `hasta` incluye el día entero; 400 si `desde` > `hasta`). Las dos con ranking aceptan `limit` (1-50, por defecto 10). Excluyen publicaciones dadas de baja y comentarios eliminados.

**Plan de trabajo diario sugerido**
| Día | Tareas |
|---|---|
| 1 | Back: `RolesGuard` (admin), usuarios controller (GET/POST/DELETE/POST rehabilitar), bloqueo de login a deshabilitados. |
| 2 | Back: estadísticas controller (3 endpoints GET con `desde`/`hasta`, agregaciones de MongoDB). |
| 3 | Front: baja de cualquier publicación para admin (publicación y publicaciones); dashboard/usuarios (listado, alta con radios, habilitar/deshabilitar). |
| 4 | Front: dashboard/estadísticas con selector de fechas y 3 gráficos de tipos distintos (ej. Chart.js / ngx-charts). |
| 5 | Front: 3 pipes propias + 3 directivas propias (usarlas en la app). |
| 6 | Front: PWA (service worker, manifest, íconos). Revisión de checklist y correcciones. |

---

## 4. Rutas de API sugeridas (referencia)

| Método | Ruta | Descripción | Sprint |
|---|---|---|---|
| POST | `/auth/registro` | Registro (JSON; imagen opcional en `imagenPerfil` como data URL base64) | 1 |
| POST | `/auth/login` | Login (usuario o correo) | 1 |
| POST | `/auth/autorizar` | Validar token, devuelve usuario | 3 |
| POST | `/auth/refrescar` | Nuevo token (15 min) | 3 |
| POST | `/publicaciones` | Crear publicación | 2 |
| GET | `/publicaciones?orden=&offset=&limit=&usuario=` | Listar | 2 |
| GET | `/publicaciones/:id` | Una publicación (detalle) | 3 |
| DELETE | `/publicaciones/:id` | Baja lógica | 2 |
| POST | `/publicaciones/:id/like` | Dar me gusta | 2 |
| DELETE | `/publicaciones/:id/like` | Quitar me gusta | 2 |
| GET | `/publicaciones/:id/comentarios?offset=&limit=` | Comentarios paginados | 3 |
| POST | `/publicaciones/:id/comentarios` | Comentar | 3 |
| PUT | `/comentarios/:id` | Editar (modificado: true) | 3 |
| GET | `/usuarios` | Listar (admin) | 4 |
| POST | `/usuarios` | Alta (admin) | 4 |
| DELETE | `/usuarios/:id` | Deshabilitar (admin) | 4 |
| POST | `/usuarios/:id/habilitar` | Rehabilitar (admin) | 4 |
| GET | `/estadisticas/publicaciones-por-usuario?desde=&hasta=&limit=` | Publicaciones por usuario (admin) | 4 |
| GET | `/estadisticas/comentarios?desde=&hasta=` | Total y comentarios por día (admin) | 4 |
| GET | `/estadisticas/comentarios-por-publicacion?desde=&hasta=&limit=` | Comentarios por publicación (admin) | 4 |

> Los nombres de rutas son sugeridos; el enunciado solo fija métodos y comportamiento.
>
> Desde el Sprint #3 todas las rutas salvo `POST /auth/registro`, `POST /auth/login` y `GET /` exigen `Authorization: Bearer <token>` (401 si falta, es inválido o venció).

---

## 5. Criterios de calidad a verificar antes de cada entrega

- [x] Status HTTP correctos en todos los endpoints (Postman, local y producción).
- [x] Sin `alert()`; todo con modales.
- [ ] Diseño uniforme en todas las pantallas.
- [x] Validaciones y mensajes claros en formularios.
- [x] Contraseñas encriptadas; JWT con vencimiento a 15 minutos.
- [x] Rutas protegidas por guard (front) y por JWT y roles (back).
- [x] Bajas lógicas (no se borra físicamente): publicaciones y usuarios.
- [x] Deploy en hosting funcionando. _(Sprint #3; el back y el front del #4 están en producción.)_

---

## 6. Instrucciones para Claude Code

1. Al iniciar una sesión, leer este archivo completo y la sección **0. Estado actual**.
2. Si el estado está vacío, inspeccionar el repositorio (front y back) para determinar qué está hecho y completar la sección 0 antes de programar.
3. Trabajar siguiendo el **plan diario** del sprint en curso; no adelantar sprints sin acordarlo.
4. Al terminar cada tarea: marcar el checkbox correspondiente y actualizar **Próximo paso** y **Fecha de última actualización**.
5. Cada requisito del enunciado debe quedar implementado literalmente; ante ambigüedad, anotarla en "Bloqueos / decisiones pendientes" y consultar.
