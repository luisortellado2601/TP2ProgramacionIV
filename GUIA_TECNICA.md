# NextPlay – Guía técnica para estudiar y explicar el código

Documento de estudio del TP #2 (Programación IV, UTN Avellaneda). Cubre lo implementado hasta el **Sprint #2** completo (registro y login, publicaciones, likes, paginación, Mi Perfil y la lectura/alta de comentarios) más el **Sprint #3** completo: en el backend, JWT validado en todas las rutas con un guard global, `autorizar`, `refrescar`, edición de comentarios y `GET /publicaciones/:id`; en el frontend, el interceptor, la pantalla "Cargando", el aviso de sesión por vencer y la página de detalle de una publicación con sus comentarios (escribir, "cargar más" y editar). Está pensado para que puedas explicar **qué hace cada pieza, por qué se hizo así y qué pasa de punta a punta**.

Los temas que más conviene dominar tienen su propia explicación de punta a punta en la sección 5: **login (5.2)**, **paginación (5.4)**, **publicaciones (5.5)**, **comentarios (5.6)** y **token, guard, `autorizar` y `refrescar` (5.8)**.

> Convención de este documento: las rutas de archivo son relativas a la raíz del repositorio. Todo lo que dice "hoy" se refiere al **backend** al cierre del Sprint #3 y al **frontend** con las 3 partes del Sprint #3 (interceptor con el token, pantalla "Cargando" y contador de sesión, y detalle de publicación con comentarios); lo que viene después (Sprint #4) se marca como _pendiente_.

---

## 1. Visión general

NextPlay es una red social de videojuegos. Son **dos proyectos independientes** que se comunican por HTTP con JSON:

```
┌──────────────────────┐    HTTP + JSON     ┌──────────────────────┐        ┌──────────────┐
│  Frontend (Angular)  │ ─────────────────► │   Backend (NestJS)   │ ─────► │ MongoDB Atlas│
│  localhost:4200      │ ◄───────────────── │   localhost:3000     │        └──────────────┘
│  (Vercel en prod.)   │   usuario + token  │                      │ ─────► ┌──────────────┐
└──────────────────────┘                    └──────────────────────┘  REST  │   Supabase   │
                                                                            │   Storage    │
                                                                            └──────────────┘
```

| Capa | Tecnología | Para qué |
|---|---|---|
| Frontend | Angular 22, TypeScript, CSS propio | Pantallas, formularios, sesión del lado del navegador |
| Backend | NestJS 12, TypeScript | API REST: validación, lógica de negocio, seguridad |
| Base de datos | MongoDB (Atlas) + Mongoose | Persistencia de usuarios, publicaciones y comentarios |
| Imágenes | Supabase Storage (API REST) | Guardar las fotos de perfil y devolver una URL pública |
| Autenticación | JWT (`@nestjs/jwt`) | Identificar al usuario en cada petición: el back lo valida con un guard global (Sprint #3) |

**Qué hace hoy la app (Sprints #1 a #3):** registrarse (con foto opcional), iniciar sesión con correo **o** nombre de usuario, ver el listado de publicaciones (paginado, ordenable por fecha o por me gusta), crear publicaciones con imagen opcional, dar y quitar me gusta, eliminar las propias, ver Mi perfil con las últimas 3 publicaciones y sus comentarios, y cerrar sesión. Las rutas privadas están protegidas con guards. Al hacer clic en el título de una publicación se abre su página de detalle, donde se puede comentar, traer más comentarios con "cargar más" y editar los propios (la edición se anuncia con la leyenda "editado"). Si la sesión está por vencer, un modal ofrece extenderla.

**Qué suma el backend del Sprint #3:** todas las rutas salvo registro, login y `GET /` exigen `Authorization: Bearer <token>`; el usuario que actúa sale del token (ya no viaja `usuarioId`); `POST /auth/autorizar` y `POST /auth/refrescar`; `PUT /comentarios/:id` para editar el propio comentario; y `GET /publicaciones/:id` para traer una sola publicación (la usa la página de detalle).

---

## 2. Estructura del repositorio

```
TP2PrograIV/
├── GUIA_TECNICA.md          Este documento
├── Backend/                 NestJS
│   ├── README.md            Fuente de verdad del proyecto: enunciado, sprints y estado
│   ├── Funcional.md         Descripción funcional / "pitch" de NextPlay
│   ├── postman/             Colección de Postman: Auth, Publicaciones y Comentarios (con tokens)
│   ├── .env.example         Variables de entorno necesarias
│   └── src/
│       ├── main.ts          Arranque: CORS, límite del body, ValidationPipe global
│       ├── app.module.ts    Módulo raíz: Config, Mongo, módulos de la app y guard JWT global
│       ├── auth/            Registro, login, autorizar, refrescar, JwtAuthGuard y decoradores (@Public, @UsuarioActual)
│       ├── usuarios/        Esquema de Usuario + CRUD de prueba
│       ├── publicaciones/   Esquema, controller, service y DTOs (alta, listado, baja lógica, likes)
│       ├── comentarios/     Esquema, controller, service y DTOs (alta, listado paginado y edición)
│       └── almacenamiento/  Subida de imágenes a Supabase
└── Frontend/                Angular
    ├── vercel.json          Configuración de deploy
    └── src/
        ├── environments/    URL de la API según entorno
        └── app/
            ├── componentes/ cargando, login, registro, publicaciones, publicacion,
            │                nueva-publicacion, publicacion-detalle, comentarios, mi-perfil, navbar, modal
            ├── guards/      authGuard, guestGuard
            ├── interceptors/ authInterceptor (Bearer y manejo del 401)
            ├── services/    AuthService, ModalService, PublicacionesService, ComentariosService
            ├── models/      Interfaces TypeScript
            └── utils/       Validadores propios, helper de errores, decodificar JWT y formatear duración
```

---

## 3. Backend (NestJS)

### 3.1 Conceptos de NestJS que se usan

| Concepto | Qué es | Dónde está en el proyecto |
|---|---|---|
| **Módulo** (`@Module`) | Agrupa controllers y providers de una funcionalidad | `AuthModule`, `UsuariosModule`, `PublicacionesModule`, `ComentariosModule`, `AlmacenamientoModule` |
| **Controller** (`@Controller`) | Recibe la petición HTTP y delega; no tiene lógica de negocio | `AuthController`, `PublicacionesController`, `ComentariosController` |
| **Provider / Service** (`@Injectable`) | Contiene la lógica; se inyecta por constructor | `AuthService`, `PasswordHasher`, `AlmacenamientoService`, `PublicacionesService`, `ComentariosService` |
| **DTO** | Clase que describe y valida el cuerpo o la query de una petición | `RegistroDto`, `LoginDto`, `ListarPublicacionesDto`, `CrearComentarioDto` |
| **Pipe** | Transforma/valida datos antes de llegar al controller | `ValidationPipe` global en `main.ts` |
| **Guard** (`CanActivate`) | Decide si una petición puede llegar al controller; si lanza una excepción, la petición se corta con ese status | `JwtAuthGuard`, registrado como global con `APP_GUARD` |
| **Decorador de metadatos** (`SetMetadata`) + `Reflector` | Marca una ruta con un dato que el guard lee después | `@Public()` |
| **Decorador de parámetro** (`createParamDecorator`) | Extrae un dato de la petición y lo entrega como argumento del método del controller | `@UsuarioActual()` |
| **Inyección de dependencias** | Nest crea las instancias y las entrega en el constructor | Todos los constructores |

### 3.2 Arranque: `Backend/src/main.ts`

1. Crea la app (`NestFactory.create`).
2. **CORS**: `CORS_ORIGIN` es una lista de dominios separados por coma. Si está definida, solo esos dominios pueden llamar a la API desde un navegador; si no (desarrollo), acepta cualquiera. _CORS lo hace cumplir el navegador, no protege la API de herramientas como Postman o curl._
3. **Límite del body JSON en 3 MB**: la imagen viaja en base64 dentro del JSON y el base64 pesa ~33 % más (2 MB → ~2,7 MB). Con el límite por defecto de Express (100 KB) no pasaría ni una foto chica.
4. **`ValidationPipe` global** con tres opciones clave:
   - `whitelist: true` → descarta propiedades que el DTO no declara.
   - `forbidNonWhitelisted: true` → en vez de descartarlas en silencio, responde **400** si llegan propiedades de más (evita que alguien mande, por ejemplo, `habilitado: false` o `_id`).
   - `transform: true` → convierte el JSON plano en una **instancia del DTO** y ejecuta los `@Transform` (recortar espacios, minúsculas) **antes** de validar.

### 3.3 Módulo raíz: `Backend/src/app.module.ts`

- `ConfigModule.forRoot({ isGlobal: true })` carga el `.env` y deja `ConfigService` disponible en toda la app.
- `MongooseModule.forRoot(MONGODB_URI)` abre la conexión. Si no hay variable, cae a una base local.
- Importa los módulos de la app.
- Registra `JwtAuthGuard` como **guard global** con `{ provide: APP_GUARD, useClass: JwtAuthGuard }`: se aplica a todas las rutas de todos los módulos sin tener que decorar cada controller (ver 3.8). Funciona porque `JwtModule` se declaró `global: true` y el guard puede inyectar `JwtService`.
- Se exporta `createObserveModule()` de `@nestjs/observe` y se pasa `ObserveInstrument` en `main.ts`: es instrumentación de observabilidad de Nest; no interviene en la lógica del TP.

### 3.4 Modelo de datos: `Backend/src/usuarios/usuario.schema.ts`

Esquema de Mongoose declarado con decoradores (`@Schema`, `@Prop`) a partir de una clase TypeScript.

| Campo | Detalle |
|---|---|
| `nombre`, `apellido` | Obligatorios |
| `correo` | Obligatorio, **único**, `lowercase`, `trim` |
| `nombreUsuario` | Obligatorio, **único**, `trim` |
| `contrasena` | Obligatorio; se guarda el **hash**, nunca la contraseña |
| `fechaNacimiento` | Obligatoria (Date) |
| `descripcion`, `imagenPerfilUrl` | Opcionales |
| `perfil` | Enum `usuario` \| `administrador`, default `usuario` |
| `habilitado` | Boolean, default `true` (baja lógica, se usa en el Sprint #4) |
| `fechaAlta` | Default: ahora |

`unique: true` crea un **índice único** en MongoDB: es la última barrera contra duplicados (aunque dos registros lleguen casi a la vez).

`Backend/src/publicaciones/publicacion.schema.ts` ya define `titulo`, `mensaje`, `imagenUrl?`, `usuario` (referencia a Usuario), `fecha`, `likes` (array de ids) y `eliminada` (baja lógica). Su controller y service se explican en la sección 3.11.

### 3.5 Registro: `POST /auth/registro` → **201 Created**

Archivos: `auth.controller.ts` → `auth.service.ts` (+ `registro.dto.ts`).

Pasos en `AuthService.registro`:

1. **Validación del DTO** (la hace el `ValidationPipe` antes de entrar al método). Reglas en `registro.dto.ts`:

   | Campo | Reglas |
   |---|---|
   | nombre / apellido | 2–50 caracteres, solo letras Unicode (con tildes y ñ), espacios, `'` y `-` |
   | correo | Formato válido, máx. 100, se pasa a minúsculas |
   | nombreUsuario | 3–20, solo letras, números, `.` y `_` |
   | contrasena | 8–64, al menos una mayúscula y un número |
   | fechaNacimiento | Fecha ISO válida, no futura, no anterior a 1900 (decorador propio) |
   | descripcion | Opcional, máx. 280 |
   | perfil | Opcional, `usuario` o `administrador` |
   | imagenPerfil | Opcional, data URL JPG/PNG/WEBP |

   Los mensajes de error son específicos por campo (`message` en cada decorador).

2. **Contraseñas iguales** (`contrasena === repetirContrasena`), si no → **400**.
3. **Duplicados**: busca por correo **o** nombre de usuario (`$or`). Si existe → **409 Conflict** diciendo cuál de los dos está repetido.
4. **Subida de imagen** (solo si vino). Se hace **después** de comprobar duplicados a propósito: así no quedan imágenes huérfanas en Supabase si el registro falla.
5. **Hash de la contraseña** con `PasswordHasher` y `usuarioModel.create(...)`.
6. **Respuesta**: `{ usuario: {...sin contraseña...}, token }`. El registro ya deja al usuario logueado.

**Decorador propio `@FechaNacimientoValida`** (`auth/dto/fecha-nacimiento-valida.validator.ts`): se registra con `registerDecorator` de class-validator. Es la forma de crear una regla de validación reutilizable cuando las incluidas no alcanzan.

**Transformadores** (`auth/dto/transformadores.ts`): `recortar` (trim) y `recortarYMinusculas`. Se enganchan con `@Transform` y corren antes de validar, por eso `"  Ana "` queda `"Ana"` y `"USER@MAIL.COM"` queda en minúsculas.

### 3.6 Login: `POST /auth/login` → **200 OK**

Pasos en `AuthService.login`:

1. Busca un usuario cuyo `correo` (pasado a minúsculas) **o** `nombreUsuario` coincidan con el campo `usuarioOCorreo`. Por eso un solo input sirve para ambos.
2. Si no existe **o** la contraseña no coincide → **401 Unauthorized** con **el mismo mensaje** ("Usuario/correo o contraseña incorrectos"). Responder igual en ambos casos evita que un atacante descubra qué usuarios existen (_user enumeration_).
3. Si la contraseña es correcta pero `habilitado` es `false` → **401** "El usuario se encuentra deshabilitado". Se chequea **después** de la contraseña para no revelar el estado de una cuenta a quien no la conoce.
4. Devuelve el mismo formato que el registro: `{ usuario, token }`.

> Por qué `HttpCode`: en Nest los `@Post` devuelven 201 por defecto. Registro lo deja en 201 (se crea un recurso) y login lo fuerza a 200 (no crea nada). El enunciado prohíbe usar códigos incorrectos.

### 3.7 Hash de contraseñas: `Backend/src/auth/password-hasher.ts`

No se usa bcrypt (no se vio en la cursada); se implementó con el módulo nativo `node:crypto`.

- **`hash`**: genera un **salt** aleatorio de 16 bytes, deriva una clave de 64 bytes con **scrypt** y guarda `"salt:hashHex"` en un único string.
- **`verify`**: separa el salt, recalcula scrypt con la contraseña recibida y compara con **`timingSafeEqual`**.

Por qué así:
- **Salt aleatorio por usuario**: dos usuarios con la misma contraseña tienen hashes distintos y las _rainbow tables_ no sirven.
- **scrypt** es una función de derivación de claves **lenta y costosa en memoria a propósito**, lo que encarece los ataques de fuerza bruta. SHA-256 solo sería demasiado rápido.
- **`timingSafeEqual`** compara en tiempo constante, para que el tiempo de respuesta no filtre cuántos caracteres coinciden.
- `scryptSync` bloquea el hilo mientras calcula (unos milisegundos). Aceptable acá; en un sistema de mucho tráfico se usaría la versión asíncrona.

### 3.8 JWT: emisión, guard global, `autorizar` y `refrescar`

**Emisión** (`AuthService.construirRespuesta` y `AuthModule`):

- `JwtModule.registerAsync` firma con `JWT_SECRET` y define el vencimiento con `JWT_EXPIRES_IN_SEGUNDOS` (por defecto **900 s = 15 minutos**, como pide el enunciado). Las variables de entorno llegan como **texto**, así que se convierte con `Number(...)`: `jsonwebtoken` interpreta un string sin unidad (`"30"`) como **milisegundos**, y el token duraría 30 ms en vez de 30 s. Mientras dure la exposición el `.env` local usa 30 s para poder probar el vencimiento; antes de entregar hay que volver a 900.
- `global: true` permite inyectar `JwtService` en cualquier módulo sin reimportar.
- **Payload** del token: `sub` (id del usuario), `correo`, `nombreUsuario`, `perfil` (el rol). `sub` es el nombre estándar de JWT para el "sujeto".
- Un JWT son tres partes en base64url: `header.payload.firmaHMAC`. El payload **se puede leer** (no es secreto); lo que no se puede es **modificarlo sin la clave** porque la firma dejaría de coincidir. Por eso nunca se guardan datos sensibles en el payload.
**Validación en cada pedido** (`auth/jwt-auth.guard.ts`):

- `JwtAuthGuard` implementa `CanActivate` y está registrado como **guard global** (`APP_GUARD` en `app.module.ts`): **toda ruta exige token salvo las marcadas con `@Public()`**. Es el enfoque "seguro por defecto": si mañana alguien agrega una ruta nueva y se olvida de protegerla, queda protegida igual.
- `@Public()` (`auth/decoradores/public.decorator.ts`) es un `SetMetadata('esPublica', true)`. El guard la detecta con `Reflector.getAllAndOverride`, que mira primero el método y después la clase. Está puesta en `POST /auth/registro`, `POST /auth/login` y `GET /`.
- Pasos del guard: (1) si la ruta es pública, deja pasar; (2) lee el encabezado `Authorization: Bearer <token>`; si falta o el esquema no es `Bearer` → **401** "Falta el token de autenticación"; (3) `jwtService.verifyAsync(token)` comprueba **firma y vencimiento**; si falla (token alterado, firmado con otra clave o vencido) → **401** "El token es inválido o está vencido"; (4) si está bien, guarda el payload en `request.usuario` y deja pasar.
- `@UsuarioActual()` (`auth/decoradores/usuario-actual.decorator.ts`) es un decorador de parámetro (`createParamDecorator`): devuelve `request.usuario.sub`, el id del dueño del token. Así los controllers escriben `crear(@UsuarioActual() usuarioId: string, ...)`. **El actor nunca se toma del body ni de la query**, porque eso lo controla el cliente: con `usuarioId` en el body cualquiera podía actuar como otro.
- `payload-token.ts` define el tipo `PayloadToken` (`sub`, `correo`, `nombreUsuario`, `perfil`, `iat`, `exp`) y `RequestAutenticada`, la `Request` de Express con el campo `usuario`.
- **Qué NO hace el guard:** no consulta la base. Confirma que el token lo firmó el servidor y no venció, pero no que el usuario siga existiendo o habilitado (hacerlo en cada pedido sería una consulta extra por request). Esa comprobación la hacen `autorizar` y `refrescar`, y se completa en el Sprint #4. Consecuencia conocida: un usuario deshabilitado conserva acceso hasta que venza su token.

**`POST /auth/autorizar` → 200** `{ usuario }` y **`POST /auth/refrescar` → 200** `{ usuario, token }`:

- Ambas pasan por el guard (sin token válido ya responden 401) y además llaman a `AuthService.obtenerVigenteOFallar(id)`: busca el usuario y, si **no existe o está deshabilitado**, responde **401** "La sesión ya no es válida". El id se valida con `Types.ObjectId.isValid` antes de consultar, para que un `sub` raro dé 401 y no un 500 por error de cast de Mongoose.
- `autorizar` sirve para que el front, al arrancar, sepa si el token guardado sigue valendo y recupere los datos del usuario. `refrescar` emite un **token nuevo con la misma payload y el vencimiento renovado**; el front lo usará para extender la sesión.
- Se devuelve 200 y no 201 porque no se crea ningún recurso (mismo criterio que el login).
- `aRespuestaUsuario` es el único lugar que arma el objeto de usuario sin contraseña; lo usan registro, login, `autorizar` y `refrescar`, así nunca se filtra el hash.

### 3.9 Imágenes: `Backend/src/almacenamiento/almacenamiento.service.ts`

Flujo de la foto de perfil:

```
<input file> ─► FileReader.readAsDataURL ─► "data:image/png;base64,AAAA..." ─► JSON del registro
                                                                                    │
Supabase Storage ◄── POST /storage/v1/object/{bucket}/perfiles/{uuid}.png ◄── AlmacenamientoService
      │
      └─► URL pública  ─►  se guarda en usuario.imagenPerfilUrl  ─►  <img [src]> en Mi perfil
```

El servicio:
1. Valida con una regex que sea `data:image/(jpeg|png|webp);base64,...` → si no, **400**.
2. Decodifica el base64 a `Buffer` y verifica `length ≤ 2 MB` → si no, **400**.
3. Arma una ruta con `randomUUID()` (nombre único e impredecible) y la extensión según el tipo.
4. Hace `fetch POST` a la API REST de Supabase con la **secret key** en los headers. Si falla → **500** con mensaje claro.
5. Devuelve la URL pública.

Decisiones:
- **Sin Multer ni SDK de Supabase**: no se vieron en la cursada; alcanza con `fetch` (nativo de Node).
- **La secret key vive solo en el servidor** (`.env`). Si la subida se hiciera desde el navegador, la clave quedaría expuesta.
- La validación de tipo/tamaño existe **en front y en back**: la del front es comodidad para el usuario; la del back es la que realmente protege.
- El constructor usa `getOrThrow`: si falta alguna variable de Supabase, **la app no arranca**. Es útil (falla rápido) pero hay que tenerlo presente al hacer el deploy.

### 3.10 Módulo Usuarios (de prueba)

`usuarios.service.ts` es un CRUD genérico anterior a Auth (`delete` ya hace **baja lógica**, `habilitado: false`). El `usuarios.controller.ts` existe pero **no está registrado** en el módulo: se reactiva y se rehace con guard de administrador en el Sprint #4 (ver sección 7).

### 3.11 Publicaciones y likes (Sprint #2): `Backend/src/publicaciones/`

| Método y ruta | Qué hace | Respuestas |
|---|---|---|
| `POST /publicaciones` | Crea una publicación (título, mensaje, imagen opcional en base64); el autor es el dueño del token | 201, 400 |
| `GET /publicaciones?orden=&usuario=&offset=&limit=` | Lista publicaciones activas con el autor incluido. Responde `{ total, publicaciones }`; `total` cuenta todas las que cumplen el filtro (sin paginar) para armar "Página X de Y" | 200, 400 |
| `GET /publicaciones/:id` | Una publicación activa con su autor y `cantidadLikes` (la usa la página de detalle). Valida el id antes de consultar y usa el mismo pipeline de `aggregate` que el listado, con un `$match` por `_id` | 200, 400 id inválido, 404 inexistente o dada de baja |
| `DELETE /publicaciones/:id` | Baja lógica (`eliminada: true`), solo el autor o un administrador | 200, 403, 404 |
| `POST /publicaciones/:id/like` | Da me gusta (uno por usuario) | 200, 409 si ya lo dio |
| `DELETE /publicaciones/:id/like` | Quita el me gusta | 200, 409 si no lo había dado |

- **El actor sale del token:** todas estas rutas pasan por el `JwtAuthGuard` global (sin token válido → 401) y el controller recibe el id con `@UsuarioActual()`. Los DTOs ya no tienen `usuarioId` (si el cliente lo manda, el `ValidationPipe` responde **400** por propiedad no permitida) y `UsuarioAccionDto` se eliminó. Hasta el Sprint #2 el actor viajaba en el body o la query y cualquiera podía actuar como otro usuario.
- **Imagen:** reutiliza `AlmacenamientoService.subirImagen(dto.imagen, 'publicaciones')`, igual que la foto de perfil.
- **Likes:** array de ids de usuario dentro de la publicación; la regla "un like por usuario" se garantiza de forma atómica en Mongo: `$addToSet` con filtro `likes: { $ne: usuarioId }` para agregar y `$pull` con filtro `likes: usuarioId` para quitar. Si el filtro no matchea, se responde 409.
- **Baja lógica:** nada se borra; `listar` filtra `eliminada: false` y las demás operaciones responden 404 sobre una publicación eliminada.
- **Por qué `listar` usa `aggregate` y no `find`:** `find` no puede ordenar por una cantidad calculada. Orden por likes necesita `cantidadLikes = $size: '$likes'`, que no existe como campo en la base, y `$lookup` trae al autor en la misma consulta. El pipeline es `$match` → `$addFields` → `$sort` → `$skip` → `$limit` → `$lookup` → `$unwind`. `listar` y `obtener` comparten el método privado `aRespuestaPublicacion`, que arma la forma de la respuesta (así las dos rutas devuelven exactamente lo mismo). Ordenar y paginar antes del `$lookup` evita unir autores de publicaciones que se van a descartar.

### 3.12 Comentarios (alta y listado: Sprint #2; edición: Sprint #3): `Backend/src/comentarios/`

El alta y el listado se adelantaron del Sprint #3 para poder mostrar comentarios en Mi Perfil (la corrección es por sprint). El `PUT` para editar se sumó con el backend del Sprint #3.

| Método y ruta | Qué hace | Respuestas |
|---|---|---|
| `POST /publicaciones/:publicacionId/comentarios` | Crea un comentario (`mensaje`; el autor es el dueño del token) | 201, 400, 404 |
| `GET /publicaciones/:publicacionId/comentarios?offset=&limit=` | Lista los comentarios de la publicación, **más recientes primero**. Responde `{ total, comentarios }` | 200, 400, 404 |
| `PUT /comentarios/:id` | Edita el mensaje del comentario y lo marca `modificado: true`. Solo el autor | 200, 400, 403, 404 |

- **Esquema** (`comentario.schema.ts`): `publicacion` (ref), `usuario` (ref), `mensaje`, `fecha`, `modificado` (default `false`, lo activa el `PUT`) y `eliminado` (baja lógica). Tiene un **índice compuesto** `{ publicacion: 1, fecha: -1 }` porque siempre se consulta "los comentarios de una publicación, del más nuevo al más viejo": el índice evita ordenar en memoria.
- **Validación** (`CrearComentarioDto`): el mensaje se recorta (`@Transform(recortar)`), es obligatorio y llega hasta 500 caracteres. Un mensaje de solo espacios queda vacío tras el recorte y devuelve **400**. El DTO solo tiene `mensaje`: el autor sale del token (`@UsuarioActual()`), no del body.
- **Reglas del service**: comentar o listar sobre una publicación inexistente **o dada de baja** devuelve **404**; un usuario del token que ya no existe devuelve **400**. El id de la publicación se valida con `Types.ObjectId.isValid` antes de consultar (si no, Mongoose lanzaría un error de cast y respondería 500).
- **Listado**: usa `find` + `sort` + `skip` + `limit` + `populate('usuario')`. A diferencia de publicaciones, acá **no hace falta `aggregate`**: se ordena por un campo real (`fecha`), no por uno calculado. El orden es `{ fecha: -1, _id: -1 }`; el `_id` desempata dos comentarios con la misma fecha para que la paginación sea estable. El `total` sale de un `countDocuments` en paralelo (`Promise.all`), igual que en publicaciones.
- **Respuesta**: cada comentario trae `id`, `publicacionId`, `mensaje`, `fecha`, `modificado` y el `autor` resumido (id, nombre, apellido, nombreUsuario, imagenPerfilUrl). Nunca se expone el hash de la contraseña ni el correo.
- **`@Controller()` sin prefijo**: las rutas se escriben completas en cada decorador. Es necesario porque el mismo controller mezcla `publicaciones/:publicacionId/comentarios` (alta y listado) con `comentarios/:id` (edición).
- **Edición (`ComentariosService.actualizar`)**: el orden de las comprobaciones importa y define el status. (1) `Types.ObjectId.isValid(id)`, si no → **400**; (2) el comentario debe existir y no estar eliminado, si no → **404**; (3) su publicación debe seguir activa, si no → **404** (cuando una publicación se da de baja, sus comentarios dejan de estar disponibles); (4) recién ahí se compara el autor con el dueño del token, si no coincide → **403**. Se responde 404 antes que 403 para no confirmar la existencia de comentarios que el usuario no puede ver. Después se cambia `mensaje`, se pone `modificado: true`, se guarda y se responde con el mismo formato que el alta. La `fecha` original **no** cambia; la leyenda "editado" del front sale de `modificado`.
- **`ActualizarComentarioDto`** extiende `CrearComentarioDto`: editar tiene las mismas reglas que crear (recortar, no vacío, hasta 500). class-validator hereda los decoradores de la clase padre.
- **Baja lógica**: el campo `eliminado` existe y el listado ya filtra `eliminado: false`, pero todavía no hay endpoint que lo active (llega con el administrador, Sprint #4).

### 3.13 Variables de entorno (`Backend/.env.example`)

| Variable | Uso |
|---|---|
| `MONGODB_URI` | Cadena de conexión a Atlas |
| `PORT` | Puerto del servidor (el hosting suele asignarlo) |
| `JWT_SECRET` | Clave con que se firman los tokens. Si se filtra, cualquiera puede fabricar tokens válidos |
| `JWT_EXPIRES_IN_SEGUNDOS` | Vida del token en segundos (900 = 15 min; 30 en el `.env` local mientras dure la exposición). Si falta, usa 900 |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_BUCKET` | Almacenamiento de imágenes |
| `CORS_ORIGIN` | Dominio(s) del front permitidos |

El `.env` real **no se sube a git** (está en `.gitignore`); solo el `.env.example` sin valores reales.

---

## 4. Frontend (Angular 22)

> Esta sección describe el front con las **3 partes del Sprint #3**: el interceptor que envía el token, `autorizar()`/`refrescar()`, la pantalla "Cargando" y el contador de sesión (4.2 a 4.4), y la página de detalle con comentarios (4.9 y 4.11).

### 4.1 Conceptos de Angular que se usan

| Concepto | Dónde se ve |
|---|---|
| **Componentes standalone** (sin NgModules): cada componente declara sus `imports` | Todos los de `componentes/` |
| **Signals** (`signal`, `computed`): estado reactivo sin RxJS para la UI | `AuthService`, `ModalService`, `enviando` en Login/Registro |
| **`inject()`** en lugar de inyección por constructor | Todos los componentes y servicios |
| **Reactive Forms** (`FormBuilder`, `FormGroup`, validadores) | Login, Registro |
| **Control flow nuevo** (`@if`, `@else`) en vez de `*ngIf` | Templates |
| **Guards funcionales** (`CanActivateFn`) | `authGuard`, `guestGuard` |
| **Lazy loading** con `loadComponent` | `app.routes.ts` |
| **`@Service()`** | Decorador de Angular 22 para servicios: los registra automáticamente en la inyección de dependencias (el equivalente moderno de `@Injectable({ providedIn: 'root' })`) |

### 4.2 Arranque y estructura

- `main.ts` → `bootstrapApplication(App, appConfig)`.
- `app.config.ts` registra `provideRouter(routes)` y `provideHttpClient(withInterceptors([authInterceptor]))`: el interceptor se ejecuta en **todas** las peticiones HTTP de la app (ver 4.4).
- `app.html` es el "esqueleto" de toda la app:
  ```html
  <app-navbar />
  <main><router-outlet /></main>
  <app-modal />
  ```
  La navbar y el modal viven **fuera** del `router-outlet`: están siempre presentes y cualquier pantalla puede disparar un modal.

### 4.3 Rutas y guards (`app.routes.ts`, `guards/`)

| Ruta | Componente | Guard |
|---|---|---|
| `/` | Cargando (valida el token al iniciar, ver 4.4) | — |
| `/login`, `/registro` | Login, Registro | `guestGuard` (solo sin sesión) |
| `/publicaciones`, `/perfil` | Publicaciones, MiPerfil | `authGuard` (requiere sesión) |
| `/publicaciones/:id` | PublicacionDetalle | `authGuard` (requiere sesión) |
| `**` | redirige a `/publicaciones` | — |

- `authGuard`: si hay sesión, deja pasar; si no, devuelve un `UrlTree` hacia `/login`.
- `guestGuard`: lo inverso, para que alguien logueado no vuelva a ver login/registro.
- Devolver un `UrlTree` (en vez de llamar a `navigate`) es la forma recomendada: el router cancela la navegación actual y redirige de forma limpia.
- **Lazy loading**: cada pantalla es un _chunk_ de JS separado que se descarga solo al visitarla (se ve en la salida de `ng build`). Reduce el peso de la carga inicial.

### 4.4 `AuthService` (`services/auth.ts`) — el corazón de la sesión

- Estado: `sesion = signal<SesionResponse | null>(...)`, inicializado leyendo `localStorage` (clave `nextplay_sesion`). Por eso **la sesión sobrevive a recargar la página**.
- Derivados con `computed`: `usuarioActual` y `estaAutenticado`. Cuando `sesion` cambia, la navbar y los guards reaccionan solos.
- `registro()` y `login()` hacen el `POST` y, con el operador `tap`, **guardan la sesión como efecto lateral** cuando la respuesta llega bien; devuelven igualmente el `Observable` para que el componente maneje `next`/`error`.
- `logout()` limpia el signal y el `localStorage`.
- `obtenerToken()` lo usa el interceptor para armar el encabezado.
- `leerSesionGuardada()` está en `try/catch`: si alguien modificó el `localStorage` y el JSON está roto, se borra y se arranca sin sesión en vez de romper la app.

**Interceptor HTTP** (`interceptors/auth-interceptor.ts`, `HttpInterceptorFn`): una función que ve cada petición antes de salir y cada respuesta antes de llegar al componente.
- **Salida:** si hay token y la URL empieza con `environment.apiUrl`, clona la petición (`clone`, porque las peticiones son inmutables) y agrega `Authorization: Bearer <token>`. El `startsWith` evita mandar el token a otros dominios.
- **Respuesta con 401** en una ruta protegida de la API que se mandó con token: es una sesión vencida o inválida. Cierra la sesión (`logout`), muestra el modal "Sesión expirada" y navega a `/login`.
- **Excepciones:** `/auth/login` y `/auth/registro` no se tratan así, porque ahí un 401 significa "credenciales incorrectas" y lo muestra la propia pantalla de login con su modal.
- **Se corta el flujo con `EMPTY`** (el observable termina sin emitir ni dar error) en vez de propagar el error. Motivo: si no, cada componente mostraría su propio modal genérico ("No pudimos cargar...") y taparía el aviso de sesión expirada. Como además la pantalla se destruye al ir a `/login`, nadie queda esperando.
- **Varias peticiones fallando a la vez** (por ejemplo, Mi perfil hace 4): solo se cierra la sesión si el token actual sigue siendo el que mandó esa petición. La primera la cierra y avisa; las demás no repiten el aviso. Esa misma comparación evita que una respuesta tardía de un token viejo cierre una sesión nueva si el usuario ya volvió a iniciar sesión.
- Qué dicen los tests (`auth-interceptor.spec.ts`, con `HttpTestingController`): agrega el Bearer, no lo agrega sin sesión ni a otros dominios, el 401 cierra y redirige una sola vez aunque fallen varias, el 401 del login llega al componente, y otros errores (403) no tocan la sesión.

**`autorizar()` y `refrescar()`** (parte 2 del Sprint #3): dos métodos más de `AuthService`, mismo patrón que `login()`/`registro()` (`POST` + `tap`).
- `autorizar()`: `POST /auth/autorizar` sin body (el interceptor ya le agrega el `Bearer`). El back devuelve `{ usuario }` sin token nuevo; el `tap` llama a un método privado `actualizarUsuario()` que **reemplaza solo el usuario** dentro de la sesión guardada, sin tocar el token ni reprogramar el contador (ver abajo): no cambió el vencimiento, no hace falta.
- `refrescar()`: `POST /auth/refrescar` sin body. El back devuelve `{ usuario, token }` con el mismo formato que login; el `tap` llama a `guardarSesion()`, la misma función que usan login y registro, así que además de persistir la sesión nueva **reprograma el contador** con el nuevo vencimiento.

**Contador de sesión** (también en `AuthService`): en vez de un `setTimeout` fijo en minutos, decodifica el propio JWT.
- `utils/jwt.ts` → `decodificarPayloadToken(token)`: un JWT es `header.payload.firma` en base64url; el payload se puede leer sin la clave (ver 5.8), así que alcanza con separar por `.`, cambiar los caracteres de base64url a base64 y `JSON.parse(atob(...))`. Devuelve `{ sub, correo, nombreUsuario, perfil, iat, exp }` (`iat`/`exp` en segundos Unix, los agrega automáticamente `jsonwebtoken` al firmar con `expiresIn`).
- `guardarSesion()` llama a `iniciarContadorSesion(token)`, que calcula `duracionMs = (exp - iat) * 1000` y programa un `setTimeout` para cuando falta **un tercio** de esa duración (`vencimientoMs - duracionMs / 3`). Con un token de 15 min esto cae a los 10 min de uso (quedan 5, como pide el enunciado); con el token de prueba de 30 s cae a los 20 s. Si el token ya venció (por ejemplo, se recargó la página mucho después), no programa nada: el próximo pedido real va a dar 401 y lo maneja el interceptor.
- Al dispararse, `avisarVencimientoProximo()` usa `modalService.confirmar(...)` (el mismo modal de confirmación que ya existía, ver 4.6) con el tiempo restante formateado (`utils/formatear-duracion.ts`, segundos o minutos según corresponda). Si el usuario confirma, llama a `refrescar()`. El modal es **persistente**: un clic en el fondo no lo descarta (ver 4.6).
- **Segundo temporizador, al vencimiento:** `iniciarContadorSesion` programa además un `setTimeout` para `exp`. Si el usuario ignoró o canceló el aviso, `expirarSesion()` cierra la sesión, muestra el modal "Sesión expirada" y navega a `/login` sin esperar a que un pedido devuelva 401 (antes, con el aviso descartado, la app seguía "funcionando" hasta el primer 401). El mensaje es la constante `MENSAJE_SESION_EXPIRADA`, compartida con el interceptor.
- `logout()` y cada `guardarSesion()` nuevo cancelan **los dos** temporizadores (`cancelarContadorSesion`) antes de programar o terminar, para no acumular avisos de una sesión vieja. Por eso, si el usuario extiende la sesión, el vencimiento del token anterior no dispara nada.
- Por qué no un `setInterval` que cuenta hacia atrás en la UI: el enunciado solo pide **un aviso puntual** a mitad de camino, no un cronómetro visible; un `setTimeout` alcanza y es más simple.

**Pantalla "Cargando"** (`componentes/cargando/`, ruta `/`): parte 2 del Sprint #3.
- `ngOnInit`: si `authService.estaAutenticado()` es falso (no hay nada en `localStorage`), navega directo a `/login` sin llamar al back.
- Si hay sesión guardada, llama a `authService.autorizar()`. Si responde bien, navega a `/publicaciones` (y de paso quedaron actualizados los datos del usuario). Si falla con **401**, el interceptor ya se encargó de cerrar la sesión, mostrar "Sesión expirada" y navegar a `/login` — como corta el flujo con `EMPTY` (ver 4.4), el `error` de este `subscribe` ni se dispara. Para cualquier otro error (por ejemplo, el back caído) sí se dispara: se muestra un modal genérico y se navega a `/login` igual, para no dejar a nadie mirando el spinner para siempre.
- El componente es el único punto de entrada que valida el token **contra el servidor** al arrancar la app; `authGuard` (4.3) sigue mirando solo `localStorage` para las demás navegaciones, que es la limitación conocida que ya estaba documentada en `Backend/README.md`.

### 4.5 Formularios con validación

**Login** (`componentes/login/`): dos campos. Usa `Validators.required`, `maxLength` y un validador propio `sinSoloEspaciosValidator` (rechaza `"   "`). La contraseña usa el mismo patrón que el back.

**Registro** (`componentes/registro/`): 9 campos. Características:
- Las **mismas reglas que el `RegistroDto`** del back, para dar feedback antes de enviar.
- **Validador a nivel de grupo** `contrasenasIgualesValidator`: compara dos controles; por eso se pasa en las opciones del `group`, no en un control individual.
- **`fechaNacimientoValidator`**: compara fechas como texto `YYYY-MM-DD`, que es seguro porque ese formato ordena alfabéticamente igual que cronológicamente y evita errores de zona horaria. `fechaDeHoy()` arma la fecha **local** (usar `toISOString()` daría la fecha en UTC y de noche mostraría el día siguiente).
- **`nonNullable`**: los controles nunca son `null`, lo que simplifica los tipos.
- **Imagen fuera del form**: se maneja con signals (`imagenPerfil`, `errorImagen`) porque un `input file` no se integra bien con Reactive Forms. Se lee con `FileReader.readAsDataURL`, se valida tipo/tamaño y se muestra vista previa.
- Antes de enviar se normalizan los datos (`trim`, correo en minúsculas) y se agrega `imagenPerfil` solo si existe (`...(imagenPerfil && { imagenPerfil })`).
- Mensajes de error se muestran solo si el campo fue **tocado** (`touched`), para no gritarle al usuario antes de que escriba.
- Si el formulario es inválido, `markAllAsTouched()` hace aparecer todos los errores a la vez.

**Manejo de errores del back**: `utils/mensaje-error.ts` toma el `message` de la respuesta de Nest (que puede ser un string o un array de strings cuando fallan varias validaciones) y lo convierte en un texto para el modal. Si no hay mensaje, usa uno genérico.

### 4.6 Modales en vez de `alert()`

- `ModalService` guarda en un signal el `estado` del modal (`exito`, `error` o `confirmacion`, con título, mensaje y un callback).
- El componente `Modal` (montado una sola vez en `app.html`) lo lee y se muestra con `@if`.
- Click en el fondo cierra el modal; el `stopPropagation` en la caja evita que un click dentro también lo cierre. Excepción: si el estado tiene `persistente: true` (4º parámetro de `confirmar`), el fondo no lo cierra y hay que elegir un botón. Lo usa el aviso de "sesión por vencer", para que no se descarte sin querer.
- Ejemplo de confirmación: cerrar sesión en la navbar llama a `modalService.confirmar('¿Querés cerrar tu sesión?', () => {...})`.

### 4.7 Navbar y pantallas

- **Navbar**: muestra enlaces distintos según `estaAutenticado()` (Ingresar/Crear cuenta vs. Publicaciones/Mi perfil/Cerrar sesión). `routerLinkActive` marca el enlace activo.
- **Mi perfil**: muestra foto (o iniciales si no hay) y datos del `usuarioActual()`, y debajo sus últimas 3 publicaciones con los comentarios de cada una (ver 4.11). Se usa `&#64;` para escribir el carácter `@` en el template, porque en Angular moderno `@` inicia un bloque de control flow.

### 4.8 Página Publicaciones (`componentes/publicaciones/`)

Es el componente "contenedor": guarda el estado, habla con el servicio y decide qué hacer. Los componentes hijos (`app-publicacion`, `app-nueva-publicacion`) solo muestran y avisan.

| Signal | Para qué |
|---|---|
| `publicaciones` | Las publicaciones de la **página actual** (no todas) |
| `total` | Cuántas publicaciones hay en total (lo devuelve el back) |
| `pagina` | Página actual, empieza en 1 |
| `orden` | `'fecha'` o `'likes'` |
| `cargando`, `creando` | Estado de la carga y si el formulario de alta está abierto |

- `totalPaginas` es un `computed`: `Math.max(1, Math.ceil(total / 5))`. Se recalcula solo cuando cambia `total`. El `Math.max(1, …)` evita mostrar "Página 1 de 0" si no hay publicaciones.
- **Un único método carga los datos**: `cargar()`. Todo lo demás (cambiar de página, de orden, crear, eliminar) cambia un signal y llama a `cargar()`. El detalle de la paginación está en 5.4.
- **Like (`alternarLike`)**: mira en el array `likes` de la publicación si el usuario ya había dado like. Si sí, llama a `DELETE`; si no, a `POST` (el servicio solo recibe el id de la publicación: quién da el like lo sabe el back por el token). Cuando el back responde, **solo se reemplaza esa publicación** dentro de la lista con `lista.map(...)` y el spread `{ ...p, likes, cantidadLikes }`; no se recarga todo el listado. Si falla (por ejemplo 409 porque dos pestañas dieron like a la vez), se muestra el error en un modal y se recarga para quedar sincronizado.
- **Eliminar**: pide confirmación con `modalService.confirmar(...)` y solo si el usuario acepta llama al back. Después recarga la misma página; si era la única publicación de la última página, retrocede una (si no, quedaría en "Página 3 de 2" y vacía).
- `@for (... track publicacion.id)`: el `track` le dice a Angular cómo identificar cada elemento, así al actualizar la lista reutiliza el DOM en vez de recrearlo.

### 4.9 Componente Publicación (`componentes/publicacion/`)

Componente **presentacional** (también llamado "tonto"): no llama al back. Recibe datos y emite eventos.

- **`input.required<Publicacion>()`**: el dato que le pasa el padre; es obligatorio.
- **`input(false)` → `grande`**: en la página de detalle la tarjeta se ve en grande (título, texto, avatar e imagen más grandes) y sin el efecto de "levantarse" al pasar el mouse. Cuando es `false`, el título es un enlace (`routerLink` a `/publicaciones/:id`) que lleva al detalle; cuando es `true` es texto, porque ya estás ahí.
- **`input(true)` → `interactiva`**: en Mi perfil se usa con `[interactiva]="false"` para mostrar la publicación solo para leer (sin botón de like ni de eliminar, solo el contador).
- **`output<Publicacion>()` → `alternarLike` y `eliminar`**: eventos hacia el padre (`(alternarLike)="alternarLike($event)"`). El hijo no decide qué hacer; solo avisa que el usuario hizo clic.
- **`computed`**: `leDiMeGusta` (¿mi id está en `likes`?) y `esMia` (¿soy el autor?). El botón "Eliminar" solo se muestra si `esMia()`. Es comodidad de interfaz: la regla real ("solo el autor o un administrador") la hace cumplir el back con un 403.
- La imagen se muestra completa y centrada (`max-height`), sin recortes, y la fecha usa el pipe `date`.

### 4.10 Nueva publicación (`componentes/nueva-publicacion/`)

- Formulario reactivo con `titulo` (2 a 100) y `mensaje` (hasta 2000): **las mismas reglas que `CrearPublicacionDto`**, más `sinSoloEspaciosValidator` para rechazar textos de solo espacios.
- La **imagen queda fuera del formulario**, como en el registro: se lee con `FileReader.readAsDataURL` a un signal, validando tipo (JPG/PNG/WEBP) y tamaño (2 MB) antes de aceptarla. Se envía en el JSON como data URL en base64 solo si existe (`...(imagen && { imagen })`).
- Al publicar con éxito: muestra un modal de éxito y emite `creada`. El padre responde volviendo a la **página 1 ordenada por fecha**, que es donde aparece la publicación nueva.

### 4.11 Comentarios y página de detalle (`componentes/comentarios/`, `componentes/publicacion-detalle/`, `componentes/mi-perfil/`)

**Mi perfil** (`mi-perfil.ts`) pide `listar({ orden: 'fecha', offset: 0, limit: 3, usuario: miId })`: es el **mismo endpoint** del listado, solo cambia el filtro `usuario` y el `limit`. Tiene tres estados (cargando / falló / vacío) con `@if ... @else if`. Debajo de cada publicación inserta `<app-comentarios [publicacionId]="publicacion.id" />` (3 pedidos extra por visita; se aceptó por simplicidad).

**Un solo componente, dos modos** (`comentarios.ts`): `Comentarios` tiene el `input(false)` **`interactivo`**.
- *Solo lectura* (Mi perfil): muestra los 5 más recientes y, si hay más, el botón `Ver N comentarios más` (`ocultos = total - mostrados`, un `computed`), que usa el mismo `cargarMas()` del modo interactivo. No hay caja para comentar ni botón de editar.
- *Interactivo* (detalle): suma la caja para comentar, el botón "cargar más" y el botón "Editar" en los comentarios propios. Se reutiliza el mismo componente en vez de duplicarlo porque la lista, el avatar y la leyenda son iguales.
- Carga con **`ngOnInit`** (los `input()` no tienen valor dentro del constructor). El título siempre muestra el total real que devuelve el back.

**Página de detalle** (`publicacion-detalle.ts`, ruta `/publicaciones/:id`):
- Lee el `id` con `ActivatedRoute.snapshot.paramMap` y llama a `PublicacionesService.obtener(id)` (`GET /publicaciones/:id`).
- Estados: cargando, "Publicación no disponible" (404 o 400: no existe, fue eliminada o el id está mal formado), error genérico, o la publicación en grande (`<app-publicacion [grande]="true">`) con `<app-comentarios [interactivo]="true">` debajo.
- Soporta **me gusta** y **eliminar** con la misma lógica que el listado (reemplaza la publicación en su signal; al eliminar vuelve a `/publicaciones` y avisa con un modal). Un 401 lo maneja el interceptor.
- Por qué existe el endpoint `GET /publicaciones/:id` y no se reutiliza el listado: la página tiene que abrirse también al recargar o pegar el enlace, y para eso la publicación se tiene que poder pedir por id.

**Comentar** (`comentar()`): un `FormControl` con `required`, `sinSoloEspaciosValidator()` y `maxLength(500)` (las mismas reglas que `CrearComentarioDto`). Si es inválido marca el campo como tocado y muestra el error; si no, hace `POST` con el mensaje recortado, pone el comentario nuevo **arriba** de la lista (es el más reciente), suma 1 al total y limpia la caja. Mientras espera, el botón queda deshabilitado ("Comentando...").

**"Cargar más"** (`cargarMas()`): pide `offset = comentarios cargados hasta ahora` y `limit = 5`, y **agrega** los que llegan al final de la lista actual (`[...lista, ...nuevos]`); nunca reemplaza. Usa la misma mecánica de `offset`/`limit` de la paginación (5.4), pero acumulando. El botón muestra cuántos faltan (`ocultos`) y desaparece cuando no queda ninguno. **Se descartan los repetidos por id**: si alguien comentó mientras tanto, los comentarios se corren una posición y la siguiente página podría traer uno que ya se mostraba.

**Editar** (`iniciarEdicion`, `guardarEdicion`): el botón "Editar" solo aparece si `comentario.autor.id` es el id del usuario logueado (comodidad de interfaz; la regla real la hace cumplir el back con un 403). Al pulsarlo, el mensaje se reemplaza por un `textarea` con el texto actual y los botones Guardar y Cancelar; solo hay un comentario en edición a la vez (`editandoId`). Si el texto quedó igual, **no se llama al back**: si no, el comentario quedaría marcado "editado" sin haber cambiado. Si cambió, `PUT /comentarios/:id` y se reemplaza ese comentario en la lista por el que devuelve el back, que ya trae `modificado: true`.

**Leyenda "editado"**: sale de `comentario.modificado` (viene del back), no de comparar textos; por eso también aparece al recargar.

**Formularios sin `ngSubmit`**: estos dos `<form>` no usan `[formGroup]`, sino un `FormControl` suelto. El evento `ngSubmit` lo emiten `NgForm`/`FormGroupDirective`, que acá no se aplican, así que el template escucha el evento nativo `(submit)="$event.preventDefault(); comentar()"`. El `preventDefault` evita que el navegador recargue la página.

**Errores**: si falla comentar, editar o "cargar más" se muestra un modal con el mensaje del back (`mensajeDeError`). Un 401 lo atiende el interceptor (4.4) antes de llegar acá.

**Tests** (`comentarios.spec.ts`, Vitest + `HttpTestingController`, manejados por el DOM): "cargar más" suma sin quitar, comentar con mensaje recortado y arriba, no enviar vacío, solo editar los propios y mostrar "editado", no llamar al back si no hay cambios, y modo solo lectura sin caja ni edición, pero con el botón "Ver N comentarios más" que trae los ocultos.

### 4.12 Environments y build

- `environment.ts` (producción) y `environment.development.ts` (local). En `angular.json`, la configuración **development** reemplaza uno por otro (`fileReplacements`), así que `ng serve` usa `localhost:3000` y `ng build` usa el de producción.
- `environment.ts` de producción apunta a la URL pública del back (`https://nextplay-delta.vercel.app`). Como `apiUrl` se compila dentro del JS, **cambiarla exige un nuevo build/deploy del front**.
- **Dos proyectos en Vercel:** cada uno apunta a una carpeta (*Root Directory*), `Backend` o `Frontend`. Vercel detecta NestJS sin configuración (entrada `src/main.ts`) y lo ejecuta como una Vercel Function.
- `vercel.json` del front: indica el comando de build, la carpeta de salida (`dist/nextplay-frontend/browser`) y una regla `rewrites` que manda **todas** las rutas a `index.html`. Sin eso, recargar `/perfil` en producción daría 404, porque ese archivo no existe en el servidor (el routing lo hace Angular en el navegador: es una SPA).

---

## 5. Flujos de punta a punta

### 5.1 Registro

```
Usuario completa form ─► Validators (front) ─► [inválido] errores bajo cada campo
          │ válido
          ▼
AuthService.registro ─► POST /auth/registro (JSON, imagen en base64)
          ▼
Nest: ValidationPipe (trim/minúsculas, whitelist, validaciones) ─► [falla] 400 + mensajes
          ▼
AuthService: ¿contraseñas iguales? ─► [no] 400
             ¿correo/usuario existentes? ─► [sí] 409
             subir imagen a Supabase ─► [falla] 400/500
             hashear contraseña, guardar en Mongo
             firmar JWT
          ▼
201 { usuario, token } ─► tap(): guardar en signal + localStorage
          ▼
Modal de éxito + navegar a /publicaciones
```

### 5.2 Login, paso a paso (cómo se armó)

Piezas que participan, de punta a punta:

| Capa | Archivo | Responsabilidad |
|---|---|---|
| Pantalla | `Frontend/.../login/login.ts` + `login.html` | Formulario, validaciones, mostrar errores |
| Servicio | `Frontend/.../services/auth.ts` | Hacer el `POST` y guardar la sesión |
| Controller | `Backend/src/auth/auth.controller.ts` | Recibir el `POST /auth/login` (responde 200) |
| DTO | `Backend/src/auth/dto/login.dto.ts` | Validar el body antes de entrar a la lógica |
| Service | `Backend/src/auth/auth.service.ts` | Buscar el usuario, verificar clave, firmar el JWT |
| Hash | `Backend/src/auth/password-hasher.ts` | Comparar la contraseña contra el hash guardado |

```
1. El usuario escribe "usuarioOCorreo" y "contrasena" en el formulario
2. Login.enviar(): ¿form inválido? ─► markAllAsTouched() y se corta (no se llama al back)
3. Se hace trim() del usuarioOCorreo y se llama a AuthService.login(payload)
4. POST /auth/login { usuarioOCorreo, contrasena }
5. Nest: ValidationPipe valida LoginDto ─► [falla] 400 con los mensajes
6. AuthService.login:
     findOne({ $or: [ { correo: usuarioOCorreo en minúsculas }, { nombreUsuario: usuarioOCorreo } ] })
     [no existe, o PasswordHasher.verify da false] ─► 401 "Usuario/correo o contraseña incorrectos"
     [existe y la clave es correcta pero habilitado = false] ─► 401 "El usuario se encuentra deshabilitado"
7. construirRespuesta: firma el JWT (payload: sub, correo, nombreUsuario, perfil; vence a los 15 min)
   y devuelve { usuario (sin contraseña), token } con status 200
8. Front: el operador tap() de AuthService.guardarSesion(respuesta):
     sesion.set(respuesta)  y  localStorage.setItem('nextplay_sesion', JSON)
9. Login.next: router.navigateByUrl('/publicaciones')
   Login.error: modalService.error(mensajeDeError(error, ...))  ─► el usuario ve el mensaje en un modal
```

Decisiones clave para explicar:
- **Un solo campo para correo o usuario**: el back busca con `$or`. El correo se pasa a minúsculas porque así se guarda (`lowercase: true` en el esquema); el nombre de usuario se compara tal cual.
- **Mismo mensaje y mismo 401** si el usuario no existe o la clave está mal: evita revelar qué cuentas existen.
- **Deshabilitado se chequea después de la clave**: no se le revela el estado de la cuenta a quien no conoce la contraseña.
- **200 y no 201**: login no crea ningún recurso; se fuerza con `@HttpCode(HttpStatus.OK)`.
- **El token se guarda junto al usuario** en una sola clave de `localStorage`. Así la sesión sobrevive a recargar la página. `signal` + `computed` hacen que navbar y guards reaccionen solos al cambiar la sesión.
- **El token se guarda y el interceptor lo envía en cada pedido** (ver 4.4). El back lo exige y lo valida (`JwtAuthGuard`, ver 3.8 y 5.8). Si vence, el primer pedido devuelve 401 y el interceptor cierra la sesión y manda al login.

### 5.3 Recarga de página con sesión activa

`AuthService` se instancia, lee `localStorage`, el signal queda cargado y `authGuard` deja pasar sin volver a pedir login.

### 5.4 Paginación (offset y limit)

**Idea:** nunca se traen todas las publicaciones; se pide un "trozo" y se avanza de a trozos. El front piensa en **páginas** (1, 2, 3…) y el back en **offset/limit** (cuántas saltear y cuántas traer).

```
Página 1  ─► offset 0   limit 5  ─► publicaciones 1 a 5
Página 2  ─► offset 5   limit 5  ─► publicaciones 6 a 10
Página 3  ─► offset 10  limit 5  ─► publicaciones 11 a 15
                    offset = (página − 1) × limit
```

**Front** (`componentes/publicaciones/publicaciones.ts`, `services/publicaciones.ts`):
1. `PUBLICACIONES_POR_PAGINA = 5` es una constante del componente.
2. Los signals `pagina` (empieza en 1) y `total` guardan el estado. `totalPaginas = Math.max(1, Math.ceil(total / 5))` es un `computed`.
3. `cargar()` traduce la página a offset: `offset: (pagina() - 1) * 5, limit: 5`, y el servicio arma `GET /publicaciones?orden=&offset=&limit=` con `HttpParams`.
4. El template muestra `Página X de Y` y los botones **Anterior** (deshabilitado en la página 1) y **Siguiente** (deshabilitado en la última). Ambos se deshabilitan también mientras `cargando()` para no disparar dos pedidos a la vez.
5. `irAPagina(n)` hace `pagina.set(n)` y `cargar()`. Cambiar el orden o crear una publicación vuelve a la página 1.

**Back** (`dto/listar-publicaciones.dto.ts`, `publicaciones.service.ts` → `listar`):
1. El DTO valida los query params: `offset` entero ≥ 0 (por defecto 0) y `limit` entero entre 1 y 50 (por defecto 10). Si no cumplen, **400**. `@Type(() => Number)` convierte el string de la URL (`"5"`) a número antes de validar; sin eso `@IsInt` fallaría siempre porque los query params llegan como texto.
2. El service hace **dos consultas en paralelo** con `Promise.all`:
   - `countDocuments(filtro)` → el `total` **sin paginar**, para que el front calcule cuántas páginas hay.
   - `aggregate([...])` con `$match` → `$addFields` (`cantidadLikes`) → `$sort` → `$skip: offset` → `$limit: limit` → `$lookup` (autor) → `$unwind`.
3. Responde `{ total, publicaciones }`.

**Por qué en ese orden:** `$sort`, `$skip` y `$limit` van **antes** del `$lookup` para no unir el autor de publicaciones que se van a descartar. Y se ordena antes de saltear: paginar sin un orden definido da resultados inconsistentes.

**Para explicar si preguntan:**
- *¿Por qué `aggregate` y no `find`?* Para ordenar por cantidad de me gusta hace falta un campo calculado (`$size` de `likes`) que no existe en la base; `find` no puede ordenar por eso.
- *¿Qué pasa si se borra la última publicación de la última página?* El front retrocede una página, porque si no quedaría en una página vacía.
- *¿Limitaciones?* `$skip` se vuelve más lento con offsets enormes (recorre y descarta); irrelevante a esta escala. Si alguien publica mientras se navega, una publicación puede repetirse o saltearse entre páginas.
- *¿Y el "cargar más" del Sprint #3?* Usa el mismo `offset`/`limit`, pero **acumula** los resultados en el array en vez de reemplazarlos.
- Los comentarios usan la misma mecánica (`ListarComentariosDto`, `{ total, comentarios }`).

### 5.5 Publicaciones de punta a punta

**Crear**
```
Nueva publicación (form: título, mensaje, imagen opcional) ─► validaciones (front)
  ─► POST /publicaciones { titulo, mensaje, imagen? }   (el autor sale del token Bearer)
  ─► Nest: ValidationPipe (CrearPublicacionDto)  [falla] 400
  ─► PublicacionesService.crear: ¿existe el usuario? [no] 400
        ¿vino imagen? ─► AlmacenamientoService.subirImagen ─► URL pública de Supabase
        publicacionModel.create(...)
  ─► 201 { id, titulo, ..., autor }
  ─► modal de éxito + el padre vuelve a la página 1 por fecha
```

**Me gusta**
```
Clic en el corazón ─► ¿mi id está en publicacion.likes?
   no ─► POST   /publicaciones/:id/like
   sí ─► DELETE /publicaciones/:id/like
   (quién da el like sale del token Bearer, no del body ni de la query)
Back: findOneAndUpdate con la condición EN EL FILTRO ($ne para agregar, el id para quitar)
   [la condición no se cumple] ─► 409 (ya diste like / no habías dado like)
   [ok] ─► 200 { id, likes, cantidadLikes } ─► el front reemplaza solo esa publicación
```
Garantizar "un like por usuario" con la condición en el filtro y `$addToSet`/`$pull` hace que sea **atómico**: aun con dos pedidos simultáneos, Mongo aplica el cambio una sola vez.

**Eliminar**
```
Botón Eliminar (solo si soy el autor) ─► modal de confirmación
  ─► DELETE /publicaciones/:id   (quién elimina sale del token Bearer)
  ─► Back: publicación inexistente o ya eliminada ─► 404
           ni autor ni administrador ─► 403
           si no: eliminada = true (baja lógica, no se borra el documento) ─► 200
  ─► el front recarga la página actual (o retrocede una si quedó vacía)
```

### 5.6 Comentarios de punta a punta

**Listar (Mi perfil y página de detalle)**
```
Mi perfil carga mis 3 últimas publicaciones (GET /publicaciones?usuario=&limit=3)
  ─► por cada una se monta <app-comentarios [publicacionId]>
  ─► GET /publicaciones/:id/comentarios?offset=0&limit=5
  ─► Back: id inválido 400 · publicación inexistente/eliminada 404
           countDocuments + find (sort fecha desc, skip, limit, populate autor)
  ─► 200 { total, comentarios }
  ─► Mi perfil muestra los 5 más recientes y el botón "Ver N comentarios más" si total > 5
  ─► el detalle (modo interactivo) muestra el botón "cargar más": pide offset = cargados, limit = 5 y agrega al final
```

**Abrir el detalle**
```
Clic en el título de una publicación ─► /publicaciones/:id  (authGuard)
  ─► GET /publicaciones/:id    [400 id inválido · 404 inexistente o eliminada ─► "Publicación no disponible"]
  ─► 200 { id, titulo, ..., likes, cantidadLikes, autor } ─► tarjeta en grande
  ─► <app-comentarios [interactivo]="true"> pide la primera página de comentarios
```

**Crear**
```
POST /publicaciones/:id/comentarios { mensaje }   (el autor sale del token Bearer)
  ─► 401 sin token válido
  ─► 400 mensaje vacío o > 500 caracteres / usuario del token inexistente / usuarioId en el body
  ─► 404 publicación inexistente o eliminada
  ─► 201 { id, publicacionId, mensaje, fecha, modificado: false, autor }
Front: la caja valida (obligatorio, no solo espacios, hasta 500) ─► POST con el mensaje recortado
  ─► el comentario devuelto se pone arriba de la lista y el total sube en 1
```

**Editar**
```
PUT /comentarios/:id { mensaje }   (Bearer)
  ─► 401 sin token válido
  ─► 400 id inválido / mensaje vacío o > 500 caracteres
  ─► 404 comentario inexistente o eliminado, o su publicación dada de baja
  ─► 403 el dueño del token no es el autor del comentario
  ─► 200 { id, ..., mensaje nuevo, modificado: true, autor }   (la fecha original no cambia)
Front: "Editar" (solo en los propios) ─► textarea con el texto actual ─► Guardar
  ─► ¿mismo texto? se cierra sin llamar al back · si cambió, PUT y se reemplaza ese comentario (ahora con "editado")
```

### 5.7 Códigos HTTP usados

| Código | Cuándo |
|---|---|
| 200 | Login correcto; `autorizar` y `refrescar`; listados y detalle de una publicación; like y quitar like; baja lógica de una publicación; edición de un comentario |
| 201 | Registro, publicación o comentario creados |
| 400 | Validación fallida, usuario inexistente o id inválido, contraseñas distintas, imagen inválida o muy pesada, propiedades no permitidas (por ejemplo `usuarioId`), `offset`/`limit` inválidos |
| 401 | Credenciales incorrectas o usuario deshabilitado (login); falta el token, es inválido o venció (cualquier ruta protegida); en `autorizar`/`refrescar`, el usuario ya no existe o está deshabilitado |
| 403 | Eliminar la publicación de otro usuario sin ser administrador; editar el comentario de otro usuario |
| 404 | Publicación inexistente o dada de baja (también al comentarla o listar sus comentarios); comentario inexistente, eliminado o de una publicación dada de baja (al editarlo) |
| 409 | Correo o nombre de usuario ya registrado; like repetido o quitar un like inexistente |
| 500 | Falla al subir la imagen a Supabase |

### 5.8 Token: validación en cada pedido, `autorizar` y `refrescar` (backend del Sprint #3)

**Cada pedido a una ruta protegida**
```
Cliente ── Authorization: Bearer <jwt> ──► JwtAuthGuard (global, antes del controller)
   ¿la ruta tiene @Public()?                      ─► sí: pasa sin mirar el token
   ¿hay encabezado "Bearer <token>"?              ─► no: 401 "Falta el token de autenticación"
   jwtService.verifyAsync(token)
      firma que no coincide / token alterado / vencido ─► 401 "El token es inválido o está vencido"
      ok ─► request.usuario = payload { sub, correo, nombreUsuario, perfil, iat, exp }
   ValidationPipe valida el body/query ─► Controller
      @UsuarioActual() entrega payload.sub ─► Service (usa ese id como actor)
```

**`autorizar` (lo usará el front al arrancar la app)**
```
POST /auth/autorizar  (Bearer)
  ─► guard: token válido
  ─► AuthService.autorizar: ¿id válido? ¿el usuario existe? ¿habilitado?   [no] 401 "La sesión ya no es válida"
  ─► 200 { usuario }        (sin contraseña y sin token nuevo)
```

**`refrescar` (lo usará el front cuando el usuario acepte extender la sesión)**
```
POST /auth/refrescar  (Bearer, todavía vigente)
  ─► guard: token válido            [vencido] 401 → el front manda al login
  ─► mismas comprobaciones de usuario vigente
  ─► firma un token NUEVO con la misma payload y el vencimiento renovado
  ─► 200 { usuario, token }
```

Decisiones clave para explicar:
- **Guard global + `@Public()`** en vez de decorar cada controller con `@UseGuards`: es seguro por defecto. Lo que se marca es la excepción (registro, login, `GET /`), no la regla.
- **Dos niveles de comprobación:** el guard solo verifica la firma y el vencimiento (barato, sin base de datos); `autorizar` y `refrescar` además consultan al usuario. Así las rutas comunes no pagan una consulta extra por pedido, y las dos rutas que deciden "¿sigo logueado?" sí detectan un usuario borrado o deshabilitado.
- **Por qué se refresca antes de que venza:** `refrescar` exige un token todavía válido. Un token vencido da 401 y el usuario tiene que volver a loguearse; por eso el front va a avisar con tiempo (a los 10 de los 15 minutos).
- **El actor sale del token, no del cliente:** el JWT está firmado, así que su `sub` no se puede falsificar sin conocer `JWT_SECRET`. El `usuarioId` del body sí se podía falsificar.
- **Por qué 401 y no 403:** 401 es "no estoy seguro de quién sos" (sin token, inválido, vencido); 403 es "sé quién sos, pero no podés hacer esto" (editar el comentario de otro, eliminar la publicación de otro).
- **Qué se puede probar sin front:** el servidor real responde 401 sin token, con token vencido o firmado con otra clave; con un token válido firmado a mano para un usuario inexistente pasa el guard y `autorizar` responde 401 "La sesión ya no es válida".

---

## 6. Pruebas y calidad

- **Postman** (`Backend/postman/NextPlay.postman_collection.json`, 50 requests): una carpeta "Auth" (registro 201/409/400, login 200/401, `autorizar` y `refrescar` con token válido, sin token y con token inválido) y una carpeta "Publicaciones" (alta, listado con los 3 filtros, **detalle por id** con 200/400/404/401, like/unlike con sus 409, comentar, **editar comentario** con sus 200/400/403/404, listar comentarios, baja lógica propia y ajena, y un caso 401 "sin token" por cada tipo de ruta). Los pasos "Setup" registran dos usuarios y guardan en variables de la colección sus ids y sus **tokens** (`autorToken`, `otroToken`); la colección usa auth Bearer con `{{autorToken}}` por defecto y las requests del "otro" usuario lo reemplazan con `{{otroToken}}`; las rutas públicas y los casos 401 usan "No Auth". Se corre entera con "Run folder" sin copiar nada. Una tercera carpeta, **"Token vencido"** (5 requests, va al final para no frenar las otras), prueba que un token vencido da 401 en `autorizar`, `refrescar` y una ruta protegida, y que `refrescar` sí funciona con el token vigente. Su pre-request lee el `exp` del token y **espera hasta que venza**; solo espera si faltan 120 s o menos, así que con `JWT_EXPIRES_IN_SEGUNDOS=900` esos pasos se omiten (`skip`) en vez de colgarse 15 minutos. Se corre aparte, con un valor bajo (por ejemplo 30) en el `.env` y "Run folder" sobre esa carpeta. Ojo: apunta a `localhost:3000` y, si el `.env` usa Atlas, crea datos reales; con el token de 30 s del `.env` local, una corrida muy lenta puede recibir 401.
- **Tests unitarios:** back 23 en 8 suites (Jest), front 20 en 4 archivos (Vitest). Los de creación de controller/service/app son básicos; los nuevos del Sprint #3 sí verifican comportamiento: `JwtAuthGuard` (ruta pública, sin token, esquema distinto de Bearer, token inválido/vencido, token válido que deja el payload en la request), `AuthService.autorizar`/`refrescar` (401 si el usuario no existe, está deshabilitado o el id no es un ObjectId) `ComentariosService.actualizar` (éxito, 403, 404 en sus dos variantes, 400) y `PublicacionesService.obtener` (éxito con autor y likes, 400 sin consultar la base, 404). En el front, el interceptor y el componente `Comentarios` (ver 4.11). Los servicios se prueban con modelos de Mongoose simulados, sin base de datos. El resto de la cobertura se probó con requests directos al servidor real (ver README).
- **Lint** del back con `oxlint`. **Build** de ambos proyectos en verde.

Comandos:
```bash
# Backend
cd Backend && npm install && npm run start:dev    # http://localhost:3000
npm test && npm run lint && npm run build

# Frontend
cd Frontend && npm install && npm start           # http://localhost:4200
npm test && npm run build
```

---

## 7. Decisiones, límites conocidos y qué decir si te lo preguntan

Es mejor conocer los puntos débiles que descubrirlos en plena presentación.

| Tema | Estado hoy | Cómo se resuelve |
|---|---|---|
| `UsuariosController` desactivado | Era un CRUD de prueba sin protección (`GET /usuarios` devolvía el hash de las contraseñas y `PATCH` permitía cambiar el `perfil`). Se quitó de `UsuariosModule` antes del deploy; el servicio y el esquema siguen | Sprint #4: se reactiva con guard JWT + rol administrador |
| Validación del token en el back (resuelto) | `JwtAuthGuard` global: toda ruta exige token salvo `@Public()` (registro, login y `GET /`); `autorizar` y `refrescar` agregan la comprobación contra la base | — |
| Actor tomado del token (resuelto) | Publicaciones y comentarios usan `@UsuarioActual()`; `usuarioId` ya no se acepta (400). Ya no se puede actuar ni hacerse pasar por administrador conociendo un id | — |
| El guard no consulta la base | Verifica firma y vencimiento, pero un usuario deshabilitado (o eliminado) conserva acceso hasta que su token venza (hoy 15 min) | Sprint #4: al implementar la baja de usuarios, el login ya lo bloquea y `autorizar`/`refrescar` también; si hiciera falta cortar de inmediato, el guard podría consultar la base |
| Interceptor del front (resuelto) | Agrega `Bearer` a los pedidos de la API y, ante un 401 en una ruta protegida, cierra la sesión, avisa y va al login. El front ya no manda `usuarioId` | — |
| Token de 30 s en local | Solo para poder probar el vencimiento durante el desarrollo | Volver `JWT_EXPIRES_IN_SEGUNDOS` a 900 (o borrar la variable) antes de entregar |
| "Cargar más" con paginación por `offset` | Si alguien comenta mientras tanto, los comentarios se corren y la siguiente página puede traer uno que ya se mostraba | El front descarta los repetidos por id; la alternativa es paginar por cursor (comentarios anteriores a una fecha) |
| Paginación por `offset` | `$skip` es lento con offsets muy grandes y, si alguien publica mientras se navega, puede repetir o saltear una publicación entre páginas | Aceptable a esta escala; la alternativa es paginar por cursor (por ejemplo, "las anteriores a esta fecha") |
| Likes atómicos (resuelto) | `darLike`/`quitarLike` usan `findOneAndUpdate` con `$addToSet` / `$pull` y la condición en el filtro (`likes: { $ne: id }` / `likes: id`); si no matchea, responde 409 | — |
| `authGuard` solo mira `localStorage` | Un token vencido deja entrar a la pantalla si se navega directo a una ruta protegida; el primer pedido da 401 y el interceptor manda al login | Parcialmente resuelto: la pantalla "Cargando" (`/`) valida el token con `autorizar` al iniciar la app. El guard sigue sin consultar al back |
| Token en `localStorage` | Es simple y suficiente para el TP; es vulnerable si hay XSS (Angular escapa el HTML por defecto, lo que mitiga el riesgo) | Alternativa: cookie `HttpOnly` |
| Autoselección de `administrador` en el registro | Cualquiera puede registrarse como administrador | Lo pide el enunciado del Sprint #1; en un sistema real el alta de admins sería restringida |
| Carrera en el registro | Dos registros simultáneos con el mismo correo pasan el chequeo; el índice único de Mongo frena al segundo, pero devolvería un 500 en vez de un 409 | Capturar el error de clave duplicada (código 11000) y convertirlo en `ConflictException` |
| Imagen en base64 dentro del JSON | Más pesado que `multipart/form-data` y exige subir el límite del body | Se eligió porque Multer no se vio en la cursada |
| `scryptSync` | Bloquea el hilo unos ms | Usar `scrypt` asíncrono si hubiera mucha carga |
| CORS en producción | `CORS_ORIGIN` todavía no está definida en el back de Vercel, así que acepta cualquier origen | Definirla con `https://nextplaygaming.vercel.app` y redeployar el back |
| Backend en ESM | `@nestjs/core` 12 es solo ESM; con CommonJS Vercel fallaba con `ERR_REQUIRE_ESM`. El back usa `"type": "module"` | Los imports relativos deben terminar en `.js` (`from './auth.service.js'`) aunque el archivo sea `.ts` |

---

## 8. Preguntas probables y respuestas cortas

**¿Por qué dos proyectos separados?** Separar responsabilidades: el front se encarga de la interfaz y el back de las reglas y los datos. Permite deployarlos y escalarlos por separado y que el back sirva a otros clientes (por ejemplo, una app móvil).

**¿Por qué validan en el front y en el back?** El front mejora la experiencia (feedback inmediato). El back es la validación que cuenta: cualquiera puede saltearse el front con Postman.

**¿Qué hace `ValidationPipe` con `whitelist` y `forbidNonWhitelisted`?** Rechaza con 400 cualquier propiedad que el DTO no declare, evitando que se inyecten campos como `habilitado` o `_id`.

**¿Cómo guardan las contraseñas?** Nunca en texto plano: salt aleatorio de 16 bytes + scrypt (64 bytes), guardado como `salt:hash`. La verificación recalcula y compara en tiempo constante.

**¿Por qué no bcrypt?** No se vio en la cursada; scrypt viene en `node:crypto` y cumple el mismo objetivo (función lenta con salt).

**¿Qué es un JWT y qué guarda el suyo?** Un token firmado con `header.payload.firma`. Guarda `sub` (id), correo, nombre de usuario y perfil; vence a los 15 minutos. El payload es legible pero no modificable sin la clave.

**¿Por qué el login responde igual si el usuario no existe o la clave está mal?** Para no revelar qué cuentas existen.

**¿Por qué 401 y no 400 en el login?** 400 es "petición mal formada"; 401 es "no autenticado". Una contraseña incorrecta es un problema de autenticación.

**¿Por qué 409 en el duplicado?** Es un conflicto con el estado actual del recurso.

**¿Qué es un guard?** Una función que decide si se puede entrar a una ruta. Acá devuelve `true` o un `UrlTree` para redirigir.

**¿Qué es un signal y por qué lo usaron?** Un valor reactivo: cuando cambia, todo lo que lo lee (templates, `computed`) se actualiza solo. Se usó para la sesión y el modal porque es más simple que un `BehaviorSubject`.

**¿Por qué `tap` en el servicio?** Para guardar la sesión como efecto secundario sin alterar el flujo que recibe el componente.

**¿Qué es lazy loading?** Cargar el código de una pantalla solo cuando se visita.

**¿Qué pasa si recargo la página?** La sesión se restaura desde `localStorage`.

**¿Dónde queda la foto?** En Supabase Storage (bucket público). En Mongo solo se guarda la URL.

**¿Por qué la clave de Supabase no está en el front?** Porque todo lo que está en el front es público. La subida pasa por el back, que sí guarda el secreto.

**¿Cómo funciona la paginación?** El front manda `offset = (página − 1) × 5` y `limit = 5`; el back valida los parámetros, cuenta el total con `countDocuments` y devuelve el trozo con `$skip` y `$limit`. Con `total` el front calcula `Math.ceil(total / 5)` páginas. Ver 5.4.

**¿Por qué dos consultas en `listar`?** Una trae las publicaciones de la página y la otra cuenta todas las que cumplen el filtro; sin el total no se sabría cuántas páginas hay. Se lanzan juntas con `Promise.all`.

**¿Cómo se evita que un usuario dé dos me gusta?** La condición está en el filtro de la operación de Mongo (`likes: { $ne: id }` con `$addToSet`), así que es atómica; si no se cumple, se responde 409.

**¿Por qué el componente Publicación no llama al back?** Es presentacional: recibe la publicación por `input` y avisa por `output` lo que el usuario hizo. El contenedor (Publicaciones) decide qué hacer. Así se reutiliza en Mi perfil con `interactiva = false`.

**¿Qué diferencia hay entre `find` y `aggregate` en el proyecto?** Publicaciones usa `aggregate` porque ordena por un campo calculado (cantidad de likes) y une al autor; comentarios usa `find` + `populate` porque ordena por un campo real (`fecha`).

**¿Por qué el listado de comentarios ordena también por `_id`?** Para desempatar comentarios con la misma fecha y que la paginación sea estable.

**¿Qué es un interceptor HTTP y para qué lo usan?** Es una función que Angular ejecuta con cada petición saliente y cada respuesta. Se usa para agregar el `Authorization: Bearer` en un solo lugar (en vez de en cada servicio) y para manejar el 401 de forma global: cierra la sesión, avisa con un modal y redirige al login.

**¿Cómo se guarda y se usa el token hoy?** El front lo guarda en `localStorage` junto al usuario y el interceptor lo envía en cada pedido a la API. El back lo exige: un `JwtAuthGuard` global verifica firma y vencimiento en cada pedido y deja el id del usuario disponible con `@UsuarioActual()`.

**¿Qué es un guard en Nest y en qué se diferencia del guard de Angular?** Es una clase con `canActivate` que decide si la petición llega al controller; si lanza una excepción, la petición se corta con ese status. Es el equivalente en el servidor de lo que `authGuard` hace con las rutas del front, pero el del back es el que de verdad protege: el del front solo mejora la experiencia.

**¿Qué hace `@Public()`?** Marca una ruta como excepción al guard global (registro, login y `GET /`). El guard lee esa marca con `Reflector`. Todo lo demás exige token.

**¿Qué diferencia hay entre el guard, `autorizar` y `refrescar`?** El guard verifica firma y vencimiento en cada pedido. `autorizar` confirma además que el usuario siga existiendo y habilitado, y devuelve sus datos. `refrescar` hace lo mismo y entrega un token nuevo con el vencimiento renovado.

**¿Qué pasa si el token venció?** Cualquier ruta protegida responde 401 "El token es inválido o está vencido". `refrescar` también, porque exige un token vigente: hay que volver a loguearse.

**¿Por qué el actor ya no viaja en el body?** Porque lo controla el cliente: cualquiera podía mandar el `usuarioId` de otro. El id del token está firmado y no se puede falsificar sin la clave. Si el cliente igual manda `usuarioId`, responde 400 por el `ValidationPipe`.

**¿Por qué el token dura 30 segundos en local?** Para poder probar el vencimiento sin esperar 15 minutos. Es una variable de entorno (`JWT_EXPIRES_IN_SEGUNDOS`); la entrega vuelve a 900.

**¿Qué pasa si se edita un comentario?** `PUT /comentarios/:id` cambia el mensaje y marca `modificado: true`. Solo lo puede hacer el autor (403 si no); la fecha original no cambia y la leyenda "editado" sale de ese campo.

**¿Cómo funciona "cargar más"?** El front pide `offset` = cantidad de comentarios ya mostrados y `limit` = 5, y **agrega** el resultado al final de la lista (no la reemplaza). Descarta los repetidos por id y el botón desaparece cuando ya se mostraron todos (`total`).

**¿Cómo se sabe que un comentario fue editado?** El back pone `modificado: true` en el `PUT` y el front muestra la leyenda "editado" a partir de ese campo; si se edita con el mismo texto, el front ni llama al back.

**¿Por qué existe `GET /publicaciones/:id`?** Para que la página de detalle funcione al recargar o abrir el enlace directamente: la publicación se pide por id en vez de depender de lo que había en el listado.

**¿Qué falta para cerrar el Sprint #1?** Nada: el deploy en Vercel ya está hecho (front: `https://nextplaygaming.vercel.app`, back: `https://nextplay-delta.vercel.app`). Queda opcional definir `CORS_ORIGIN` en el back para restringir el acceso al dominio del front.

---

## 9. Mapa rápido de archivos clave (para repasar)

| Quiero explicar… | Archivo |
|---|---|
| Arranque, CORS y validación global | `Backend/src/main.ts` |
| Reglas de validación del registro | `Backend/src/auth/dto/registro.dto.ts` |
| Lógica de registro/login, `autorizar`, `refrescar` y emisión del JWT | `Backend/src/auth/auth.service.ts` |
| Guard JWT global | `Backend/src/auth/jwt-auth.guard.ts` (se registra en `Backend/src/app.module.ts`) |
| `@Public()` y `@UsuarioActual()` | `Backend/src/auth/decoradores/` |
| Hash de contraseñas | `Backend/src/auth/password-hasher.ts` |
| Subida de imágenes | `Backend/src/almacenamiento/almacenamiento.service.ts` |
| Listado, baja lógica y likes | `Backend/src/publicaciones/publicaciones.service.ts` |
| Validación de `offset` y `limit` | `Backend/src/publicaciones/dto/listar-publicaciones.dto.ts` |
| Comentarios (alta, listado y edición) | `Backend/src/comentarios/comentarios.service.ts` |
| Paginación en el front | `Frontend/src/app/componentes/publicaciones/publicaciones.ts` |
| Publicación (presentacional) | `Frontend/src/app/componentes/publicacion/publicacion.ts` |
| Alta de publicación | `Frontend/src/app/componentes/nueva-publicacion/nueva-publicacion.ts` |
| Comentarios (escribir, "cargar más", editar) y Mi perfil | `Frontend/src/app/componentes/comentarios/` y `componentes/mi-perfil/` |
| Página de detalle de una publicación | `Frontend/src/app/componentes/publicacion-detalle/` |
| Una publicación por id (back) | `PublicacionesService.obtener` en `Backend/src/publicaciones/publicaciones.service.ts` |
| Login (pantalla) | `Frontend/src/app/componentes/login/login.ts` |
| Modelo de usuario | `Backend/src/usuarios/usuario.schema.ts` |
| Sesión del lado del cliente | `Frontend/src/app/services/auth.ts` |
| Formulario de registro | `Frontend/src/app/componentes/registro/registro.ts` |
| Protección de rutas | `Frontend/src/app/guards/` y `Frontend/src/app/app.routes.ts` |
| Modales | `Frontend/src/app/services/modal.ts` y `componentes/modal/` |
| Deploy del front | `Frontend/vercel.json` y `Frontend/src/environments/` |
