# NextPlay – Guía técnica para estudiar y explicar el código

Documento de estudio del TP #2 (Programación IV, UTN Avellaneda). Cubre el proyecto completo, **Sprints #1 a #4**, en front y back:

- **Sprint #1:** registro y login, hash de contraseñas, imagen de perfil.
- **Sprint #2:** publicaciones, me gusta, paginación y Mi perfil.
- **Sprint #3:** comentarios, JWT validado en todas las rutas con un guard global, `autorizar`, `refrescar`, interceptor, pantalla "Cargando", aviso de sesión por vencer y página de detalle.
- **Sprint #4:** administrador (usuarios y estadísticas), baja de cualquier publicación, editar mi perfil, 3 pipes y 3 directivas propias y PWA.

Está pensado para que puedas explicar **qué hace cada pieza, por qué se hizo así y qué pasa de punta a punta**.

### Mapa de estudio: los métodos que más se preguntan

Cada fila dice **dónde está** el método (front → back) y en qué sección está explicado paso a paso.

| # | Tema | Dónde está | En una línea | Sección |
|---|---|---|---|---|
| 1 | **Subida de imágenes** | Front: `seleccionarImagen()` (registro, alta de admin, nueva publicación, editar perfil). Back: `AlmacenamientoService.subirImagen()` | El front convierte el archivo a base64 con `FileReader`; el back lo valida, lo sube a Supabase con `fetch` y guarda solo la URL | **5.9** |
| 2 | **Me gusta / quitar me gusta** | Front: `alternarLike()` (`publicaciones.ts`, `publicacion-detalle.ts`). Back: `PublicacionesService.darLike()` y `quitarLike()` | Un solo `findOneAndUpdate` atómico con `$addToSet` / `$pull`; si la condición no se cumple, 409 | **5.10** |
| 3 | **Login** | Front: `Login.enviar()` → `AuthService.login()`. Back: `AuthService.login()` + `PasswordHasher.verify()` | Busca por correo o usuario, verifica el hash, firma el JWT | 5.2 |
| 4 | **Token en cada pedido** | Front: `authInterceptor`. Back: `JwtAuthGuard` (global) | El front agrega el `Bearer`; el back verifica firma y vencimiento y deja el id en `@UsuarioActual()` | 4.4, 5.8 |
| 5 | **Paginación** | Front: `Publicaciones.cargar()`. Back: `PublicacionesService.listar()` | `offset = (página − 1) × 5`; el back responde `{ total, publicaciones }` | 5.4 |
| 6 | **Crear publicación** | Front: `NuevaPublicacion.publicar()`. Back: `PublicacionesService.crear()` | Valida, sube la imagen si hay, guarda con el autor del token | 5.5 |
| 7 | **Baja lógica de publicación (autor o admin)** | Front: `puedeEliminar`. Back: `PublicacionesService.eliminar()` | `eliminada = true`; solo el autor o un administrador (403 si no) | **5.11** |
| 8 | **Comentarios** (crear, listar, "cargar más", editar) | `Comentarios` (front) y `ComentariosService` (back) | `offset`/`limit` acumulando; editar marca `modificado: true` | 5.6 |
| 9 | **Roles de administrador** | Back: `@Roles` + `RolesGuard`. Front: `adminGuard` + `*appSoloAdmin` | El back lee el perfil **de la base**, no del token | 3.10, **4.13** |
| 10 | **Estadísticas** | Back: `EstadisticasService` (3 `aggregate`). Front: `AdminEstadisticas` + `Grafico` | `$match` → `$group` → `$lookup` → `$sort`; el front pide las 3 a la vez con `forkJoin` | **5.12**, 4.14 |
| 11 | **Editar mi perfil** | Front: `EditarPerfil` → `AuthService.actualizarPerfil()`. Back: `PerfilController` → `UsuariosService.actualizarPerfil()` | `PUT /usuarios/me`; el id sale del token y el token no cambia | **5.13** |
| 12 | **Pipes y directivas propias** | `Frontend/src/app/pipes/` y `directives/` | 3 pipes (transforman un valor) y 3 directivas (cambian un elemento) | **4.15** |
| 13 | **PWA** | `manifest.webmanifest`, `ngsw-config.json`, `provideServiceWorker` | Instalable y abre sin conexión (solo la interfaz) | **4.16** |
| 14 | **Sesión por vencer** | Front: `AuthService.iniciarContadorSesion()` | Dos `setTimeout`: aviso a un tercio de la vida del token y cierre al vencer | 4.4 |

> Convención de este documento: las rutas de archivo son relativas a la raíz del repositorio. Los métodos se nombran por su nombre (no por número de línea) para que la guía no se desactualice al editar el código. El estado del proyecto (qué está hecho y qué falta) está en `Backend/README.md`; esta guía es solo para estudiar y explicar el código.

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
| Imágenes | Supabase Storage (API REST) | Guardar las fotos de perfil y de publicaciones y devolver una URL pública |
| Autenticación | JWT (`@nestjs/jwt`) | Identificar al usuario en cada petición: el back lo valida con un guard global (Sprint #3) |
| Gráficos | Chart.js | Dashboard de estadísticas del administrador (Sprint #4) |
| PWA | `@angular/service-worker` | App instalable y con interfaz disponible sin conexión (Sprint #4) |

**Qué hace la app (Sprints #1 a #4):** registrarse (con foto opcional), iniciar sesión con correo **o** nombre de usuario, ver el listado de publicaciones (paginado, ordenable por fecha o por me gusta), crear publicaciones con imagen opcional, dar y quitar me gusta, eliminar las propias, ver Mi perfil con las últimas 3 publicaciones y sus comentarios, **editar el propio perfil** y cerrar sesión. Las rutas privadas están protegidas con guards. Al hacer clic en el título de una publicación se abre su página de detalle, donde se puede comentar, traer más comentarios con "cargar más" y editar los propios (la edición se anuncia con la leyenda "editado"). Si la sesión está por vencer, un modal ofrece extenderla. Un **administrador** además puede dar de baja cualquier publicación, listar usuarios, crear usuarios (con perfil `usuario` o `administrador`), habilitarlos y deshabilitarlos, y ver un dashboard con tres gráficos de estadísticas.

**Qué suma el backend del Sprint #3:** todas las rutas salvo registro, login y `GET /` exigen `Authorization: Bearer <token>`; el usuario que actúa sale del token (ya no viaja `usuarioId`); `POST /auth/autorizar` y `POST /auth/refrescar`; `PUT /comentarios/:id` para editar el propio comentario; y `GET /publicaciones/:id` para traer una sola publicación (la usa la página de detalle).

**Qué suma el backend del Sprint #4:** `RolesGuard` y `@Roles(...)`; gestión de usuarios para administradores (`GET`, `POST`, `DELETE` y `POST :id/habilitar` sobre `/usuarios`); tres rutas de estadísticas con lapso elegible; `PUT /usuarios/me` para editar el propio perfil; y `cantidadComentarios` en cada publicación (para el botón de comentarios de la tarjeta).

---

## 2. Estructura del repositorio

```
TP2PrograIV/
├── GUIA_TECNICA.md          Este documento
├── Backend/                 NestJS
│   ├── README.md            Fuente de verdad del proyecto: enunciado, sprints y estado
│   ├── Funcional.md         Descripción funcional / "pitch" de NextPlay
│   ├── postman/             Dos colecciones de Postman (Sprint 1-3: 13 requests; Sprint 4: 34) y environments Local y Produccion
│   ├── .env.example         Variables de entorno necesarias
│   └── src/
│       ├── main.ts          Arranque: CORS, límite del body, ValidationPipe global
│       ├── app.module.ts    Módulo raíz: Config, Mongo, módulos de la app y guard JWT global
│       ├── auth/            Registro, login, autorizar, refrescar, JwtAuthGuard, RolesGuard y decoradores (@Public, @Roles, @UsuarioActual)
│       ├── usuarios/        Esquema de Usuario, gestión de usuarios para administradores (UsuariosController) y edición del propio perfil (PerfilController)
│       ├── estadisticas/    Estadísticas para administradores (3 rutas GET con lapso)
│       ├── publicaciones/   Esquema, controller, service y DTOs (alta, listado, detalle, baja lógica, likes)
│       ├── comentarios/     Esquema, controller, service y DTOs (alta, listado paginado y edición)
│       └── almacenamiento/  Subida de imágenes a Supabase
└── Frontend/                Angular
    ├── vercel.json          Configuración de deploy
    ├── ngsw-config.json     Qué cachea el service worker (PWA)
    ├── public/              Favicon, manifest.webmanifest e íconos de la PWA
    └── src/
        ├── environments/    URL de la API según entorno
        └── app/
            ├── componentes/ cargando, login, registro, publicaciones, publicacion, nueva-publicacion,
            │                publicacion-detalle, comentarios, mi-perfil, editar-perfil, navbar, modal, spinner,
            │                admin-usuarios, admin-alta-usuario, admin-estadisticas, grafico
            ├── guards/      authGuard, guestGuard, adminGuard
            ├── interceptors/ authInterceptor (Bearer y manejo del 401)
            ├── directives/  appSoloAdmin, appPastillaPerfil, appContadorCaracteres
            ├── pipes/       iniciales, estadoUsuario, tiempoRelativo
            ├── services/    AuthService, ModalService, PublicacionesService, ComentariosService, UsuariosService, EstadisticasService
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
| **Guard** (`CanActivate`) | Decide si una petición puede llegar al controller; si lanza una excepción, la petición se corta con ese status | `JwtAuthGuard`, registrado como global con `APP_GUARD`; `RolesGuard`, activado por `@Roles()` |
| **Decorador de metadatos** (`SetMetadata`) + `Reflector` | Marca una ruta con un dato que el guard lee después | `@Public()` y `@Roles()` |
| **Decorador compuesto** (`applyDecorators`) | Junta varios decoradores en uno solo | `@Roles()` = `SetMetadata` + `UseGuards(RolesGuard)` |
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
| `habilitado` | Boolean, default `true`. Es la baja lógica del usuario: un administrador lo pone en `false` (deshabilitar) y el usuario ya no puede ingresar |
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

- `JwtModule.registerAsync` firma con `JWT_SECRET` y define el vencimiento con `JWT_EXPIRES_IN_SEGUNDOS` (por defecto **900 s = 15 minutos**, como pide el enunciado). Las variables de entorno llegan como **texto**, así que se convierte con `Number(...)`: `jsonwebtoken` interpreta un string sin unidad (`"30"`) como **milisegundos**, y el token duraría 30 ms en vez de 30 s. Para probar el vencimiento se puede bajar el valor en el `.env` local (se usó 30 y 60 s); hoy está en 900.
- `global: true` permite inyectar `JwtService` en cualquier módulo sin reimportar.
- **Payload** del token: `sub` (id del usuario), `correo`, `nombreUsuario`, `perfil` (el rol). `sub` es el nombre estándar de JWT para el "sujeto".
- Un JWT son tres partes en base64url: `header.payload.firmaHMAC`. El payload **se puede leer** (no es secreto); lo que no se puede es **modificarlo sin la clave** porque la firma dejaría de coincidir. Por eso nunca se guardan datos sensibles en el payload.
**Validación en cada pedido** (`auth/jwt-auth.guard.ts`):

- `JwtAuthGuard` implementa `CanActivate` y está registrado como **guard global** (`APP_GUARD` en `app.module.ts`): **toda ruta exige token salvo las marcadas con `@Public()`**. Es el enfoque "seguro por defecto": si mañana alguien agrega una ruta nueva y se olvida de protegerla, queda protegida igual.
- `@Public()` (`auth/decoradores/public.decorator.ts`) es un `SetMetadata('esPublica', true)`. El guard la detecta con `Reflector.getAllAndOverride`, que mira primero el método y después la clase. Está puesta en `POST /auth/registro`, `POST /auth/login` y `GET /`.
- Pasos del guard: (1) si la ruta es pública, deja pasar; (2) lee el encabezado `Authorization: Bearer <token>`; si falta o el esquema no es `Bearer` → **401** "Falta el token de autenticación"; (3) `jwtService.verifyAsync(token)` comprueba **firma y vencimiento**; si falla (token alterado, firmado con otra clave o vencido) → **401** "El token es inválido o está vencido"; (4) si está bien, guarda el payload en `request.usuario` y deja pasar.
- `@UsuarioActual()` (`auth/decoradores/usuario-actual.decorator.ts`) es un decorador de parámetro (`createParamDecorator`): devuelve `request.usuario.sub`, el id del dueño del token. Así los controllers escriben `crear(@UsuarioActual() usuarioId: string, ...)`. **El actor nunca se toma del body ni de la query**, porque eso lo controla el cliente: con `usuarioId` en el body cualquiera podía actuar como otro.
- `payload-token.ts` define el tipo `PayloadToken` (`sub`, `correo`, `nombreUsuario`, `perfil`, `iat`, `exp`) y `RequestAutenticada`, la `Request` de Express con el campo `usuario`.
- **Qué NO hace el guard:** no consulta la base. Confirma que el token lo firmó el servidor y no venció, pero no que el usuario siga existiendo o habilitado (hacerlo en cada pedido sería una consulta extra por request). Esa comprobación la hacen `autorizar`, `refrescar` y, desde el Sprint #4, `RolesGuard` en las rutas de administrador (ver 3.10). Consecuencia conocida: en las rutas comunes, un usuario deshabilitado conserva acceso hasta que venza su token (15 min). El enunciado solo pide que el guard valide firma y vencimiento y que `autorizar` confirme el token, así que se dejó así; si hiciera falta cortar de inmediato, el guard podría consultar la base.

**`POST /auth/autorizar` → 200** `{ usuario }` y **`POST /auth/refrescar` → 200** `{ usuario, token }`:

- Ambas pasan por el guard (sin token válido ya responden 401) y además llaman a `AuthService.obtenerVigenteOFallar(id)`: busca el usuario y, si **no existe o está deshabilitado**, responde **401** "La sesión ya no es válida". El id se valida con `Types.ObjectId.isValid` antes de consultar, para que un `sub` raro dé 401 y no un 500 por error de cast de Mongoose.
- `autorizar` sirve para que el front, al arrancar, sepa si el token guardado sigue valendo y recupere los datos del usuario. `refrescar` emite un **token nuevo con la misma payload y el vencimiento renovado**; el front lo usa para extender la sesión.
- Se devuelve 200 y no 201 porque no se crea ningún recurso (mismo criterio que el login).
- `aRespuestaUsuario` (`usuarios/usuario-respuesta.ts`) es el único lugar que arma el objeto de usuario sin contraseña; lo usan registro, login, `autorizar` y `refrescar`, así nunca se filtra el hash.

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

### 3.10 Roles, Usuarios y Estadísticas (Sprint #4, back): `Backend/src/usuarios/`, `Backend/src/estadisticas/`

**`RolesGuard` y `@Roles(...)`** (`auth/roles.guard.ts`, `auth/decoradores/roles.decorator.ts`):

- `@Roles(PerfilUsuario.ADMINISTRADOR)` junta dos cosas con `applyDecorators`: guarda los perfiles permitidos con `SetMetadata` y activa `RolesGuard` con `UseGuards`. Se puede poner en un método o en un controller entero. El módulo del controller debe registrar el modelo `Usuario` (`MongooseModule.forFeature`), porque el guard se instancia ahí.
- Orden de ejecución: primero el `JwtAuthGuard` global (token válido y vigente, deja el payload en `request.usuario`) y después `RolesGuard`.
- `RolesGuard` **lee el perfil y el estado desde la base**, no del token. El token dice el perfil que tenía al emitirse y puede quedar viejo: si se le quita el rol a un admin o se lo deshabilita, tiene que perder el acceso en el acto, sin esperar a que venza su JWT. Respuestas: **401** si el usuario ya no existe o está deshabilitado ("La sesión ya no es válida"), **403** si existe pero su perfil no alcanza ("No tenés permisos para realizar esta acción").
- Constante `ROLES` definida en el guard (no en el decorador) para evitar un import circular entre ambos archivos.

**Usuarios** (`usuarios.controller.ts`, solo administradores):

| Método y ruta | Qué hace | Respuestas |
|---|---|---|
| `GET /usuarios` | Lista todos los usuarios, los más nuevos primero | 200 |
| `POST /usuarios` | Alta con las mismas reglas del registro (`RegistroDto`); `perfil` define si es usuario o administrador. **No devuelve token** (no inicia sesión como el nuevo usuario) | 201, 400, 409 correo o nombre de usuario repetido |
| `DELETE /usuarios/:id` | Baja lógica: `habilitado: false`. Un administrador no puede deshabilitarse a sí mismo | 200, 400 id inválido o intento de auto-baja, 404 |
| `POST /usuarios/:id/habilitar` | Alta lógica: `habilitado: true` | 200, 400, 404 |

- El alta reutiliza `AuthService.crearUsuario(dto)`, que es el mismo código del registro público (validar contraseñas, duplicados, subir la imagen, hashear y guardar). `AuthModule` exporta `AuthService` y `UsuariosModule` lo importa; así no se duplica la lógica.
- `usuarios/usuario-respuesta.ts` tiene `aRespuestaUsuario`, la única función que arma el usuario "público" (sin el hash). La usan auth y usuarios.
- Se quitaron `GET :id` y `PATCH :id` del CRUD de prueba anterior: el `PATCH` aceptaba cualquier body sin validar y permitía cambiar `perfil` o `contrasena` a mano.
- 200 y no 204 en `DELETE`: devuelve el usuario ya deshabilitado, útil para que el front actualice la fila.
- El login de un usuario deshabilitado ya respondía 401 "El usuario se encuentra deshabilitado" (ver 3.6).

**Editar mi perfil** (`perfil.controller.ts`, cualquier usuario con sesión): `PUT /usuarios/me` → **200** con el usuario actualizado. Detalle de punta a punta en 5.13.

- Vive en un **controller aparte** (`PerfilController`) y no en `UsuariosController`, porque este último tiene `@Roles(ADMINISTRADOR)` a nivel de clase y bloquearía a los usuarios comunes. Los dos comparten el prefijo `usuarios` y el mismo `UsuariosService`. No chocan: `PUT me` y `DELETE :id` usan métodos distintos.
- El id sale del token (`@UsuarioActual()`), nunca de la URL ni del body: un usuario solo puede editarse a sí mismo.
- `ActualizarPerfilDto` solo admite `nombre`, `apellido`, `fechaNacimiento`, `descripcion` e `imagenPerfil`. Correo, nombre de usuario, contraseña y perfil **no se pueden cambiar**: si llegan, el `ValidationPipe` responde 400 (`forbidNonWhitelisted`). Como el token solo lleva `sub`, correo, nombre de usuario y perfil, nada de eso cambia, así que **no hace falta emitir un token nuevo**.

**Estadísticas** (`estadisticas/`, solo administradores). Las tres rutas son `GET` y aceptan `desde` y `hasta` (opcionales):

| Ruta | Devuelve | Gráfico pensado |
|---|---|---|
| `/estadisticas/publicaciones-por-usuario` | `[{ usuarioId, nombreUsuario, cantidad }]`, de más a menos | Barras |
| `/estadisticas/comentarios` | `{ total, porDia: [{ fecha, cantidad }] }` | Líneas |
| `/estadisticas/comentarios-por-publicacion` | `[{ publicacionId, titulo, cantidad }]`, de más a menos | Torta |

- Las dos con ranking aceptan `limit` (1 a 50, por defecto 10).
- Fechas: se aceptan `2026-11-01` o una fecha ISO completa. Si `hasta` viene solo como fecha, se incluye el **día entero** (internamente `$lt` del día siguiente). Si `desde` es posterior a `hasta` → **400**. Un solo día se pide con `desde` y `hasta` iguales.
- Se usa el pipeline de agregación de MongoDB: `$match` (fecha y no eliminado) → `$group` (cuenta) → `$lookup` (trae usuario o publicación para mostrar el nombre o título) → `$sort` → `$limit`.
- Se excluyen publicaciones dadas de baja y los comentarios de esas publicaciones o eliminados: la consigna dice que al dar de baja una publicación "sus comentarios dejan de estar disponibles".
- Los nombres de colección de los `$lookup` se piden al modelo (`modelo.collection.name`) en vez de escribirlos a mano: Mongoose pluraliza a su manera (`Publicacion` → `publicacions`).
- Los días se agrupan y se filtran en **UTC**. El enunciado no pide una zona horaria; un comentario hecho a la noche en Argentina (UTC-3) puede caer en el día siguiente. Si hiciera falta, se resuelve pasando `timezone` a `$dateToString` y ajustando el corte de `desde`/`hasta`.

### 3.11 Publicaciones y likes (Sprint #2): `Backend/src/publicaciones/`

| Método y ruta | Qué hace | Respuestas |
|---|---|---|
| `POST /publicaciones` | Crea una publicación (título, mensaje, imagen opcional en base64); el autor es el dueño del token | 201, 400 |
| `GET /publicaciones?orden=&usuario=&offset=&limit=` | Lista publicaciones activas con el autor incluido. Responde `{ total, publicaciones }`; `total` cuenta todas las que cumplen el filtro (sin paginar) para armar "Página X de Y". Cada publicación trae `cantidadLikes` y `cantidadComentarios` | 200, 400 |
| `GET /publicaciones/:id` | Una publicación activa con su autor y `cantidadLikes` (la usa la página de detalle). Valida el id antes de consultar y usa el mismo pipeline de `aggregate` que el listado, con un `$match` por `_id` | 200, 400 id inválido, 404 inexistente o dada de baja |
| `DELETE /publicaciones/:id` | Baja lógica (`eliminada: true`), solo el autor o un administrador | 200, 403, 404 |
| `POST /publicaciones/:id/like` | Da me gusta (uno por usuario) | 200, 409 si ya lo dio |
| `DELETE /publicaciones/:id/like` | Quita el me gusta | 200, 409 si no lo había dado |

- **El actor sale del token:** todas estas rutas pasan por el `JwtAuthGuard` global (sin token válido → 401) y el controller recibe el id con `@UsuarioActual()`. Los DTOs ya no tienen `usuarioId` (si el cliente lo manda, el `ValidationPipe` responde **400** por propiedad no permitida) y `UsuarioAccionDto` se eliminó. Hasta el Sprint #2 el actor viajaba en el body o la query y cualquiera podía actuar como otro usuario.
- **Imagen:** reutiliza `AlmacenamientoService.subirImagen(dto.imagen, 'publicaciones')`, igual que la foto de perfil.
- **Likes:** array de ids de usuario dentro de la publicación; la regla "un like por usuario" se garantiza de forma atómica en Mongo: `$addToSet` con filtro `likes: { $ne: usuarioId }` para agregar y `$pull` con filtro `likes: usuarioId` para quitar. Si el filtro no matchea, se responde 409.
- **Baja lógica:** nada se borra; `listar` filtra `eliminada: false` y las demás operaciones responden 404 sobre una publicación eliminada.
- **Por qué `listar` usa `aggregate` y no `find`:** `find` no puede ordenar por una cantidad calculada. Orden por likes necesita `cantidadLikes = $size: '$likes'`, que no existe como campo en la base, y `$lookup` trae al autor en la misma consulta. El pipeline es `$match` → `$addFields` → `$sort` → `$skip` → `$limit` → `$lookup` → `$unwind`. `listar` y `obtener` comparten el método privado `aRespuestaPublicacion`, que arma la forma de la respuesta (así las dos rutas devuelven exactamente lo mismo). Ordenar y paginar antes del `$lookup` evita unir autores de publicaciones que se van a descartar.
- **`cantidadComentarios`:** el método privado `etapasCantidadComentarios()` agrega al pipeline un `$lookup` a la colección de comentarios con un sub-pipeline (`$match` de los no eliminados + `$count`), que devuelve un solo número en vez de traer los comentarios; después `$addFields` lo deja como `cantidadComentarios` (0 si no hay) y `$project` descarta el campo auxiliar. Lo usan `listar` y `obtener`. Es lo que muestra el botón de comentarios de la tarjeta.

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
- **Baja lógica**: el campo `eliminado` existe y el listado y las estadísticas ya filtran `eliminado: false`, pero **no hay un endpoint que lo active**: el enunciado solo pide dar de baja publicaciones, y sus comentarios dejan de estar disponibles a través de la publicación (404 al listar, comentar o editar; ver 5.11).

### 3.13 Variables de entorno (`Backend/.env.example`)

| Variable | Uso |
|---|---|
| `MONGODB_URI` | Cadena de conexión a Atlas |
| `PORT` | Puerto del servidor (el hosting suele asignarlo) |
| `JWT_SECRET` | Clave con que se firman los tokens. Si se filtra, cualquiera puede fabricar tokens válidos |
| `JWT_EXPIRES_IN_SEGUNDOS` | Vida del token en segundos (900 = 15 min, que es lo que pide el enunciado y el valor actual del `.env` local). Se puede bajar para probar el vencimiento. Si falta, usa 900 |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_BUCKET` | Almacenamiento de imágenes |
| `CORS_ORIGIN` | Dominio(s) del front permitidos |

El `.env` real **no se sube a git** (está en `.gitignore`); solo el `.env.example` sin valores reales.

---

## 4. Frontend (Angular 22)

> Esta sección describe el front completo (Sprints #1 a #4). Sesión, interceptor, `autorizar()`/`refrescar()`, pantalla "Cargando" y contador de sesión: 4.2 a 4.4. Publicaciones y comentarios: 4.8 a 4.11. Sprint #4 (administrador, dashboard, pipes y directivas, PWA): 4.13 a 4.16.

### 4.1 Conceptos de Angular que se usan

| Concepto | Dónde se ve |
|---|---|
| **Componentes standalone** (sin NgModules): cada componente declara sus `imports` | Todos los de `componentes/` |
| **Signals** (`signal`, `computed`): estado reactivo sin RxJS para la UI | `AuthService`, `ModalService`, `enviando` en Login/Registro |
| **`inject()`** en lugar de inyección por constructor | Todos los componentes y servicios |
| **Reactive Forms** (`FormBuilder`, `FormGroup`, validadores) | Login, Registro |
| **Control flow nuevo** (`@if`, `@else`) en vez de `*ngIf` | Templates |
| **Guards funcionales** (`CanActivateFn`) | `authGuard`, `guestGuard`, `adminGuard` |
| **Lazy loading** con `loadComponent` | `app.routes.ts` |
| **`input()` / `output()`** en vez de `@Input` / `@Output` | `PublicacionCard`, `Comentarios`, `Grafico` |
| **Pipes propios** (`@Pipe`) | `iniciales`, `estadoUsuario`, `tiempoRelativo` (4.15) |
| **Directivas propias**: estructural y de atributo | `*appSoloAdmin`, `appPastillaPerfil`, `appContadorCaracteres` (4.15) |
| **`effect()`** | Reaccionar a un signal con un efecto: `SoloAdminDirective`, `Grafico` |
| **RxJS** (`Subject`, `switchMap`, `forkJoin`, `debounceTime`, `tap`, `catchError`) | Dashboard de estadísticas (4.14); `tap` en `AuthService` |
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
| `/perfil/editar` | EditarPerfil | `authGuard` |
| `/admin/usuarios`, `/admin/usuarios/nuevo` | AdminUsuarios, AdminAltaUsuario | `authGuard` + `adminGuard` |
| `/admin/estadisticas` | AdminEstadisticas | `authGuard` + `adminGuard` |
| `**` | redirige a `/publicaciones` | — |

- `authGuard`: si hay sesión, deja pasar; si no, devuelve un `UrlTree` hacia `/login`.
- `guestGuard`: lo inverso, para que alguien logueado no vuelva a ver login/registro.
- `adminGuard`: deja pasar solo si `usuarioActual().perfil` es administrador; si no, `UrlTree` hacia `/publicaciones`. Va **después** de `authGuard` en `canActivate: [authGuard, adminGuard]` (los guards corren en orden y `authGuard` ya manda al login si no hay sesión).
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
- **Mi perfil**: muestra foto (o iniciales si no hay) y todos los datos del `usuarioActual()` (incluida la fecha de nacimiento, que se muestra en UTC con `date: 'dd/MM/yyyy' : 'UTC'` porque llega como medianoche UTC y, sin eso, retrocedería un día en Argentina), un botón **Editar perfil** que lleva a `/perfil/editar` (ver 5.13) y, debajo, sus últimas 3 publicaciones con los comentarios de cada una (ver 4.11).
- Los enlaces **Usuarios** y **Estadísticas** de la navbar usan `*appSoloAdmin`: solo los ve un administrador (ver 4.13). Se usa `&#64;` para escribir el carácter `@` en el template, porque en Angular moderno `@` inicia un bloque de control flow.

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
- **`computed`**: `leDiMeGusta` (¿mi id está en `likes`?), `esMia` (¿soy el autor?), `esAdministrador` y `puedeEliminar = esMia() || esAdministrador()`. El botón "Eliminar" solo se muestra si `puedeEliminar()`: **un administrador lo ve en cualquier publicación** (Sprint #4). Es comodidad de interfaz: la regla real ("solo el autor o un administrador") la hace cumplir el back con un 403 (ver 5.11).
- **Botón de comentarios** (solo en la tarjeta del listado, no en el detalle): muestra `cantidadComentarios` y, al hacer clic, despliega con `@if` un `<app-comentarios [limite]="3" [enlazarDetalle]="true">`. Los comentarios **se piden recién al desplegar** (el signal `comentariosAbiertos` arranca en `false`), así el listado no dispara un pedido por tarjeta. Si hay más de 3, "Ver N comentarios más" lleva a la página de detalle.
- **Tiempo relativo y avatar:** la fecha usa el pipe `tiempoRelativo` ("hace 5 min") con la fecha exacta en el `title`; si el autor no tiene foto se muestran sus iniciales con el pipe `iniciales` (ver 4.15).
- La imagen se muestra completa y centrada (`max-height`), sin recortes, y la fecha usa el pipe `date`.

### 4.10 Nueva publicación (`componentes/nueva-publicacion/`)

- Formulario reactivo con `titulo` (2 a 100) y `mensaje` (hasta 2000): **las mismas reglas que `CrearPublicacionDto`**, más `sinSoloEspaciosValidator` para rechazar textos de solo espacios.
- La **imagen queda fuera del formulario**, como en el registro: se lee con `FileReader.readAsDataURL` a un signal, validando tipo (JPG/PNG/WEBP) y tamaño (2 MB) antes de aceptarla. Se envía en el JSON como data URL en base64 solo si existe (`...(imagen && { imagen })`).
- Al publicar con éxito: muestra un modal de éxito y emite `creada`. El padre responde volviendo a la **página 1 ordenada por fecha**, que es donde aparece la publicación nueva.

### 4.11 Comentarios y página de detalle (`componentes/comentarios/`, `componentes/publicacion-detalle/`, `componentes/mi-perfil/`)

**Mi perfil** (`mi-perfil.ts`) pide `listar({ orden: 'fecha', offset: 0, limit: 3, usuario: miId })`: es el **mismo endpoint** del listado, solo cambia el filtro `usuario` y el `limit`. Tiene tres estados (cargando / falló / vacío) con `@if ... @else if`. Debajo de cada publicación inserta `<app-comentarios [publicacionId]="publicacion.id" [limite]="3" />` (3 pedidos extra por visita; se aceptó por simplicidad).

**Un solo componente, tres usos** (`comentarios.ts`): `Comentarios` se configura con tres inputs: `limite` (cuántos trae por carga, 5 por defecto), `interactivo` (`false` por defecto) y `enlazarDetalle` (`false` por defecto).
- *Solo lectura* (Mi perfil, `[limite]="3"`): muestra los 3 más recientes y, si hay más, el botón `Ver N comentarios más` (`ocultos = total - mostrados`, un `computed`), que trae el resto con el mismo `cargarMas()`. No hay caja para comentar ni botón de editar.
- *Desplegado en la tarjeta del listado* (`[limite]="3" [enlazarDetalle]="true"`): igual que el anterior, pero "Ver N comentarios más" es un enlace (`routerLink`) al detalle, para que la tarjeta no crezca sin límite.
- *Interactivo* (detalle, `[interactivo]="true"`): suma la caja para comentar, el botón "cargar más" y el botón "Editar" en los comentarios propios. Se reutiliza el mismo componente en vez de duplicarlo porque la lista, el avatar y la leyenda son iguales.
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

### 4.13 Administrador en el front (Sprint #4)

**Quién es administrador:** `usuario.perfil === 'administrador'` en la sesión. Tres piezas lo usan:

| Pieza | Para qué |
|---|---|
| `adminGuard` (4.3) | Cierra las rutas `/admin/...`: un usuario común que las escriba a mano vuelve a `/publicaciones` |
| `*appSoloAdmin` (4.15) | Oculta los enlaces Usuarios y Estadísticas de la navbar a quien no es admin |
| `PublicacionCard.puedeEliminar` (4.9) | Muestra "Eliminar" en cualquier publicación |

Las tres son **comodidad de interfaz**: la seguridad real está en el back (`@Roles` + `RolesGuard`, 3.10), que responde 403 aunque alguien llame a la API a mano.

**Listado de usuarios** (`admin-usuarios.ts`, `/admin/usuarios`): `UsuariosService.listar()` (`GET /usuarios`) llena el signal `usuarios`. Cada fila muestra avatar o iniciales, nombre, perfil, estado y fecha de alta.
- **`alternarHabilitado(usuario)`**: si está habilitado, pide confirmación con `modalService.confirmar(...)` y recién entonces llama a `deshabilitar` (`DELETE /usuarios/:id`); si está deshabilitado, llama directo a `habilitar` (`POST /usuarios/:id/habilitar`), porque no es destructivo.
- Cuando el back responde, **se reemplaza solo esa fila** (`lista.map(u => u.id === actualizado.id ? actualizado : u)`); no se recarga todo. El signal `actualizandoId` guarda la fila en curso para deshabilitar su botón y evitar doble clic.
- `esUsuarioActual(usuario)` evita que el admin se deshabilite a sí mismo desde la interfaz; el back lo prohíbe igual con 400.
- Usa los pipes `iniciales` y `estadoUsuario` y la directiva `appPastillaPerfil` (4.15).

**Alta de usuario** (`admin-alta-usuario.ts`, `/admin/usuarios/nuevo`): es el mismo formulario del registro (mismas validaciones, mismo `contrasenasIgualesValidator` de grupo, misma imagen opcional con `FileReader`) más un campo `perfil` que en la pantalla se dibuja como **dos radio buttons** (`usuario` / `administrador`, por defecto `usuario`). Llama a `UsuariosService.crear()` (`POST /usuarios`), que **no inicia sesión** con el usuario creado; muestra un modal de éxito y vuelve al listado.

**Usuario deshabilitado:** no hay pantalla especial. Su intento de login recibe **401** "El usuario se encuentra deshabilitado" (ver 3.6) y la pantalla de login lo muestra en un modal. Si ya tenía sesión abierta, conserva el acceso a las rutas comunes hasta que venza el token (límite conocido, sección 7); `autorizar`, `refrescar` y las rutas de admin sí lo cortan al instante.

### 4.14 Dashboard de estadísticas (Sprint #4)

Archivos: `componentes/admin-estadisticas/` (la pantalla), `componentes/grafico/` (envoltorio de Chart.js) y `services/estadisticas.ts` (los 3 `GET`). El back y las agregaciones están en 5.12.

**La pantalla (`AdminEstadisticas`)** resuelve tres problemas con RxJS:

1. **Lapso elegible.** `lapso` es un `FormGroup` con `desde` y `hasta` (campos `<input type="date">`). Sin fechas significa "todo el histórico"; con una sola, el lapso queda abierto del otro lado.
2. **Las fechas se aplican solas, sin botón.** `lapso.valueChanges.pipe(debounceTime(300))` espera 300 ms sin cambios antes de consultar, para no disparar un pedido por cada dígito mientras alguien escribe una fecha a mano.
3. **Nunca datos viejos en pantalla.** Cada lapso a consultar entra por un `Subject` (`pedidos`). Un `switchMap` **cancela el pedido anterior** si todavía no terminó, así que si el usuario cambia las fechas rápido, solo se muestra la respuesta del último.

```ts
this.pedidos.pipe(
  tap(() => this.cargando.set(true)),
  switchMap((rango) => forkJoin({            // los 3 pedidos salen juntos, con el mismo lapso
    porUsuario:    this.estadisticasService.publicacionesPorUsuario(rango),
    comentarios:   this.estadisticasService.comentarios(rango),
    porPublicacion:this.estadisticasService.comentariosPorPublicacion(rango),
  }).pipe(catchError(...)))                  // error: modal + EMPTY, la pantalla no se rompe
).subscribe(({ porUsuario, comentarios, porPublicacion }) => { ...set de los 3 signals... });
```

- **`forkJoin`** espera a que respondan las tres rutas y entrega un objeto con los tres resultados: así los gráficos siempre son comparables (mismo lapso, mismo momento).
- **Validación del lapso** (`errorDelLapso`): "hasta" no puede ser posterior a hoy, "desde" no puede ser posterior a hoy ni a "hasta". Si no se cumple, muestra un modal y **no consulta**. Es la misma regla que aplica el back (400), repetida acá para dar feedback inmediato. `hoy()` arma la fecha **local** (no `toISOString()`, que daría la fecha en UTC).
- **De datos a gráfico con `computed`:** cada gráfico necesita dos arreglos, etiquetas y valores. Por ejemplo `usuariosEtiquetas = computed(() => publicacionesPorUsuario().map(u => '@' + u.nombreUsuario))`. Cuando llega un resultado nuevo, los `computed` se recalculan solos. Los títulos largos se acortan con `acortar()` (24 caracteres) para que entren en la torta.
- `formatearDia` convierte `"2026-11-05"` en `"05/11"` **cortando el texto**, sin crear un `Date`: así la zona horaria no puede mover el día.

**El gráfico (`Grafico`)** es un componente reutilizable con `input()`: `tipo` (`'bar' | 'line' | 'pie'`), `etiquetas`, `valores`, `serie` y `descripcion`. En el template del dashboard se usa tres veces con tipos distintos (barras, líneas y torta, como pide el enunciado).
- Dibuja en un `<canvas>` con Chart.js. Un **`effect()`** lee los inputs; cuando cambian, **destruye el gráfico anterior y crea uno nuevo** (`this.grafico?.destroy()`). Sin el `destroy` Chart.js se queja de que el canvas ya está en uso. Al destruirse el componente, `DestroyRef.onDestroy` también lo destruye.
- `Chart.register(...)` registra **solo** los elementos que se usan (barras, líneas, torta, ejes, leyenda y tooltip) en vez de todo Chart.js: el chunk de `admin-estadisticas` sigue siendo el más pesado, pero menos.
- Los colores (`PALETA`) están **en el TypeScript y no en el CSS** porque Chart.js dibuja en canvas y no lee variables CSS; se copiaron del sistema de diseño de `styles.css`.
- `viewChild.required('canvas')` obtiene el elemento del template; `ChangeDetectionStrategy.OnPush` evita revisiones innecesarias (el gráfico se actualiza por el `effect`, no por detección de cambios).

### 4.15 Pipes y directivas propias (Sprint #4)

El enunciado pide **3 pipes y 3 directivas propias**. Carpetas: `pipes/` y `directives/`. La diferencia para explicar: **un pipe transforma un valor para mostrarlo en el template** (`{{ valor | pipe }}`); **una directiva cambia el comportamiento, el aspecto o la estructura de un elemento** (`<div unaDirectiva>`).

**Pipes** (clases con `@Pipe` y el método `transform`, que son **puras** por defecto: se recalculan solo si cambia su entrada):

| Pipe | Uso | Qué hace | Dónde se usa |
|---|---|---|---|
| `iniciales` | `{{ nombre \| iniciales: apellido }}` | Devuelve la primera letra de nombre y apellido en mayúscula, para el avatar cuando no hay foto | navbar, publicación, comentarios, Mi perfil, editar perfil, admin usuarios |
| `estadoUsuario` | `[class]="u.habilitado \| estadoUsuario"` | Recibe un booleano y devuelve la clase CSS (`usuario__pill--habilitado` o `--deshabilitado`) para pintar la pastilla verde o roja | admin usuarios |
| `tiempoRelativo` | `{{ fecha \| tiempoRelativo }}` | "hace un momento", "hace 5 min", "hace 3 h", "hace 2 días"; pasada una semana, la fecha `dd/MM/yy`. Si la fecha está apenas en el futuro (relojes desfasados) la trata como "ahora". Acepta un segundo parámetro `ahora` para poder probarla sin depender del reloj | publicación, comentarios |

> Límite conocido: como son puras, "hace 5 min" **no se actualiza sola** mientras la pantalla sigue abierta (hasta que se recarga la lista). Un pipe `pure: false` lo resolvería pero se recalcularía en cada detección de cambios.

**Directivas:**

| Directiva | Tipo | Qué hace | Cómo funciona |
|---|---|---|---|
| `*appSoloAdmin` | **Estructural** (el `*`) | Dibuja el elemento solo si el usuario es administrador | Inyecta `TemplateRef` y `ViewContainerRef`. Un `effect()` lee `usuarioActual()`: si es admin y no hay vista, `createEmbeddedView`; si dejó de serlo, `clear()`. Reacciona sola si la sesión cambia |
| `[appPastillaPerfil]="perfil"` | **De atributo** | Agrega la clase `pastilla-perfil--administrador` o `--usuario` según el perfil | Usa `host: { '[class.xxx]': '...' }` con un `input.required` (con alias `appPastillaPerfil`). Solo pone la clase; los colores los define el CSS del componente |
| `[appContadorCaracteres]="500"` | **De atributo** | Agrega debajo de un `<textarea>`/`<input>` un contador "12 / 500": amarillo desde el 90 %, rojo con "¡Límite alcanzado!" al llegar al máximo | En `ngOnInit` crea un `<small>` con `Renderer2` y lo inserta después del campo; escucha `input` y también `valueChanges` del `NgControl` (para `reset()`/`setValue()` por código, que no disparan `input`). En `ngOnDestroy` quita el listener y **elimina el `<small>`** (es hermano del campo, no hijo: si no, quedaría huérfano) |

- `appContadorCaracteres` se usa en nueva publicación, comentarios (escribir y editar) y editar perfil.
- Se usa `Renderer2` en vez de tocar el DOM directamente: es la forma recomendada por Angular, que desacopla el código del navegador.
- Estructural vs. atributo: la estructural agrega o quita elementos del DOM (como `@if`); la de atributo modifica uno que ya existe.

### 4.16 PWA (Sprint #4)

Una PWA es una web que se puede **instalar** como app y que **abre sin conexión**. Piezas:

| Pieza | Archivo | Para qué |
|---|---|---|
| Manifest | `Frontend/public/manifest.webmanifest` | Nombre, `short_name`, `start_url`, `display: standalone` (sin barra del navegador), colores y los íconos (incluidos los `maskable`, que el sistema recorta con su forma) |
| Enlaces | `Frontend/src/index.html` | `<link rel="manifest">`, `theme-color` y `apple-touch-icon` (iOS) |
| Íconos | `Frontend/public/icons/` | 72 a 512 px más los `maskable` y el `apple-touch-icon` |
| Config del cache | `Frontend/ngsw-config.json` | Qué guarda el service worker (ver abajo) |
| Registro | `provideServiceWorker(...)` en `app.config.ts` | Activa el service worker |

```ts
provideServiceWorker('ngsw-worker.js', {
  enabled: !isDevMode(),                       // solo en el build de producción
  registrationStrategy: 'registerWhenStable:30000',  // espera a que la app esté estable (o 30 s)
})
```

**Qué cachea `ngsw-config.json`:** el grupo `app` (HTML, JS, CSS y el manifest, `prefetch`: se descargan al instalar), el grupo `assets` (imágenes y tipografías, `lazy`: se guardan al usarse) y las tipografías de Google Fonts. **No hay `dataGroups`**: las llamadas a la API no se cachean, así que sin conexión se ve la interfaz pero no los datos.

**Cosas para explicar:**
- Corre **solo en producción**: con `ng serve` no hay service worker (`enabled: !isDevMode()`). Para probarlo en local: `npm run build` y servir `dist/nextplay-frontend/browser` con un servidor estático que redirija todo a `index.html`.
- **Actualizaciones:** el service worker sirve la versión cacheada y baja la nueva en segundo plano; quien ya visitó el sitio puede ver la versión anterior hasta recargar una o dos veces. `SwUpdate` permitiría avisar "hay versión nueva" (no está implementado).

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
Garantizar "un like por usuario" con la condición en el filtro y `$addToSet`/`$pull` hace que sea **atómico**: aun con dos pedidos simultáneos, Mongo aplica el cambio una sola vez. _El paso a paso completo, con el código, está en 5.10._

**Eliminar**
```
Botón Eliminar (solo si soy el autor o administrador; ver 5.11) ─► modal de confirmación
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
  ─► Mi perfil muestra los 3 más recientes y el botón "Ver N comentarios más" si total > 3
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
| 400 | Validación fallida, usuario inexistente o id inválido, contraseñas distintas, imagen inválida o muy pesada, propiedades no permitidas (por ejemplo `usuarioId`, o `correo` al editar el perfil), `offset`/`limit` inválidos; un administrador que intenta deshabilitarse a sí mismo; estadísticas con `desde` posterior a `hasta` o `hasta` posterior a hoy |
| 401 | Credenciales incorrectas o usuario deshabilitado (login); falta el token, es inválido o venció (cualquier ruta protegida); en `autorizar`/`refrescar`/`PUT /usuarios/me` y en las rutas de administrador, el usuario ya no existe o está deshabilitado |
| 403 | Eliminar la publicación de otro usuario sin ser administrador; editar el comentario de otro usuario; usar una ruta de administrador (`/usuarios`, `/estadisticas`) con perfil `usuario` |
| 404 | Publicación inexistente o dada de baja (también al comentarla o listar sus comentarios); comentario inexistente, eliminado o de una publicación dada de baja (al editarlo); usuario inexistente al habilitar o deshabilitar |
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

**`autorizar` (lo usa el front al arrancar la app, en la pantalla "Cargando")**
```
POST /auth/autorizar  (Bearer)
  ─► guard: token válido
  ─► AuthService.autorizar: ¿id válido? ¿el usuario existe? ¿habilitado?   [no] 401 "La sesión ya no es válida"
  ─► 200 { usuario }        (sin contraseña y sin token nuevo)
```

**`refrescar` (lo usa el front cuando el usuario acepta extender la sesión)**
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
- **Por qué se refresca antes de que venza:** `refrescar` exige un token todavía válido. Un token vencido da 401 y el usuario tiene que volver a loguearse; por eso el front avisa con tiempo (a los 10 de los 15 minutos, ver 4.4).
- **El actor sale del token, no del cliente:** el JWT está firmado, así que su `sub` no se puede falsificar sin conocer `JWT_SECRET`. El `usuarioId` del body sí se podía falsificar.
- **Por qué 401 y no 403:** 401 es "no estoy seguro de quién sos" (sin token, inválido, vencido); 403 es "sé quién sos, pero no podés hacer esto" (editar el comentario de otro, eliminar la publicación de otro).
- **Qué se puede probar sin front:** el servidor real responde 401 sin token, con token vencido o firmado con otra clave; con un token válido firmado a mano para un usuario inexistente pasa el guard y `autorizar` responde 401 "La sesión ya no es válida".

### 5.9 Subida de imágenes: cómo y dónde

**Idea en una frase:** el front **no sube** nada a ningún servidor de imágenes; convierte el archivo a texto (base64) y lo manda dentro del JSON. El **back** valida, sube a Supabase con su clave secreta y guarda en Mongo **solo la URL**.

**Quién la usa:** cuatro pantallas del front y tres puntos del back, todos terminan en el mismo método.

| Pantalla (front) | Campo del JSON | Endpoint | Quién sube (back) | Carpeta en Supabase |
|---|---|---|---|---|
| Registro (`registro.ts`) | `imagenPerfil` | `POST /auth/registro` | `AuthService.crearUsuario` | `perfiles/` |
| Alta de usuario del admin (`admin-alta-usuario.ts`) | `imagenPerfil` | `POST /usuarios` | `AuthService.crearUsuario` (el mismo) | `perfiles/` |
| Nueva publicación (`nueva-publicacion.ts`) | `imagen` | `POST /publicaciones` | `PublicacionesService.crear` | `publicaciones/` |
| Editar perfil (`editar-perfil.ts`) | `imagenPerfil` | `PUT /usuarios/me` | `UsuariosService.actualizarPerfil` | `perfiles/` |

**Paso a paso**

```
FRONT
1. <input type="file" [accept]="tiposImagen" (change)="seleccionarImagen($event)">
2. seleccionarImagen(evento):
     archivo = input.files[0]
     ¿archivo.type es JPG/PNG/WEBP?  ¿archivo.size ≤ 2 MB?   [no] errorImagen + input.value = ''
     FileReader.readAsDataURL(archivo)  ─► onload: imagen.set(lector.result)
     lector.result = "data:image/png;base64,iVBORw0KGgo..."   (también sirve de vista previa en <img>)
3. Al enviar:  ...(imagen && { imagen })   ─► la clave viaja solo si hay imagen
   POST/PUT con JSON (no hay multipart ni FormData)

BACK
4. main.ts: el body JSON puede pesar hasta 3 MB (base64 pesa ~33 % más que el archivo)
5. ValidationPipe + DTO: @Matches(/^data:image\/(jpeg|png|webp);base64,/)       [falla] 400
6. El service valida lo suyo PRIMERO (usuario existe / correo no duplicado) y recién entonces sube
7. AlmacenamientoService.subirImagen(dataUrl, carpeta)       ◄── el método central
8. Guarda la URL que devolvió en publicacion.imagenUrl / usuario.imagenPerfilUrl
9. Responde con la URL; el front la pone en <img [src]> y el navegador la baja directo de Supabase
```

**El método central: `AlmacenamientoService.subirImagen` (`Backend/src/almacenamiento/almacenamiento.service.ts`)**

```ts
// 1. Validar formato: tiene que ser "data:image/<tipo>;base64,<datos>" y el tipo, uno permitido
const coincidencia = PATRON_DATA_URL.exec(dataUrl);
if (!coincidencia || !EXTENSIONES[tipo]) throw new BadRequestException('La imagen debe ser un archivo JPG, PNG o WEBP');

// 2. Decodificar a bytes y validar el tamaño real
const contenido = Buffer.from(coincidencia[2], 'base64');
if (contenido.length > TAMANO_MAXIMO_BYTES) throw new BadRequestException('La imagen no puede superar los 2 MB');

// 3. Nombre único e impredecible
const ruta = `${carpeta}/${randomUUID()}.${EXTENSIONES[tipo]}`;

// 4. Subir a Supabase por su API REST, con la clave secreta (solo existe en el servidor)
const respuesta = await fetch(`${this.url}/storage/v1/object/${this.bucket}/${ruta}`, {
  method: 'POST',
  headers: { apikey: clave, Authorization: `Bearer ${clave}`, 'Content-Type': tipo },
  body: contenido,
}).catch(() => null);
if (!respuesta?.ok) throw new InternalServerErrorException('No se pudo guardar la imagen...');

// 5. URL pública (el bucket es público)
return `${this.url}/storage/v1/object/public/${this.bucket}/${ruta}`;
```

**Por qué se hizo así (para explicar)**
- **Base64 dentro del JSON y no `multipart`:** Multer no se vio en la cursada. El costo es que el body pesa ~33 % más, por eso se subió el límite a 3 MB.
- **La sube el back y no el front:** la clave secreta de Supabase no puede estar en el navegador (todo lo del front es público).
- **Sin SDK de Supabase:** alcanza con `fetch`, que viene en Node.
- **Se sube después de validar** (usuario, duplicados): si el registro falla, no quedan imágenes sueltas en el bucket.
- **Se valida en dos lugares:** el front por comodidad (error inmediato); el back es el que protege de verdad, porque cualquiera puede mandar un pedido sin pasar por el front.
- **`randomUUID()` en el nombre:** evita que dos archivos pisen el mismo nombre y que alguien adivine URLs.
- **En Mongo solo la URL**, no la imagen: la base queda liviana.
- Si faltan las variables `SUPABASE_*`, `getOrThrow` hace que la app **no arranque** (falla rápido).

**Límites conocidos (mejor saberlos antes de que pregunten)**
- Si Mongo falla **después** de subir la imagen, queda un archivo suelto en el bucket (no se borra).
- Al cambiar la foto de perfil, **la anterior no se borra** de Supabase.
- El tipo se valida por lo que **declara** el data URL (`image/png`), no inspeccionando los bytes del archivo. Para este TP alcanza; en producción se verificaría el contenido real.

### 5.10 Me gusta y quitar me gusta: cómo y dónde

**Idea en una frase:** un **solo botón (el corazón)** que, según si ya diste me gusta, llama a `POST` o a `DELETE` sobre `/publicaciones/:id/like`; el back lo resuelve con **una única operación atómica de Mongo** y devuelve la lista de likes actualizada.

**Dónde está cada pieza**

| Capa | Archivo | Método / elemento |
|---|---|---|
| Botón (presentacional) | `componentes/publicacion/publicacion.html` y `.ts` | `(click)="alternarLike.emit(publicacion())"`; `leDiMeGusta` (`computed`) pinta el corazón activo |
| Contenedor | `componentes/publicaciones/publicaciones.ts` y `publicacion-detalle/publicacion-detalle.ts` | `alternarLike(publicacion)` |
| Servicio HTTP | `services/publicaciones.ts` | `darLike(id)` → `POST /publicaciones/:id/like`; `quitarLike(id)` → `DELETE /publicaciones/:id/like` |
| Controller | `Backend/src/publicaciones/publicaciones.controller.ts` | `darLike` (con `@HttpCode(200)`) y `quitarLike`, ambos con `@UsuarioActual()` |
| Service | `Backend/src/publicaciones/publicaciones.service.ts` | `darLike(id, usuarioId)` y `quitarLike(id, usuarioId)` |
| Modelo | `Backend/src/publicaciones/publicacion.schema.ts` | `likes`: arreglo de ids de usuario dentro de cada publicación |

**Front: `alternarLike` (el "toggle")**

```ts
const yaDioLike = publicacion.likes.includes(usuario.id);           // ¿mi id está en el arreglo?
const peticion = yaDioLike
  ? this.publicacionesService.quitarLike(publicacion.id)             // sí → DELETE
  : this.publicacionesService.darLike(publicacion.id);               // no → POST

peticion.subscribe({
  next: ({ likes, cantidadLikes }) =>
    this.publicaciones.update((lista) =>                             // reemplaza SOLO esa publicación
      lista.map((p) => (p.id === publicacion.id ? { ...p, likes, cantidadLikes } : p))),
  error: (error) => { this.modalService.error(...); this.cargar(); } // modal + recarga para resincronizar
});
```

- El servicio **no manda el id del usuario**: quién da el like lo sabe el back por el token (`Authorization: Bearer`, que agrega el interceptor).
- No se recarga el listado: se reemplaza solo la tarjeta afectada con `lista.map(...)` y el spread `{ ...p, likes, cantidadLikes }`.
- El componente `Publicacion` es tonto: solo emite el evento; **el contenedor decide** si es like o unlike.

**Back: `darLike` (y `quitarLike` es su espejo)**

```ts
async darLike(id: string, usuarioId: string) {
  await this.obtenerUsuarioOFallar(usuarioId);      // 400 si el usuario del token no existe
  await this.obtenerActivaOFallar(id);              // 400 id inválido · 404 inexistente o eliminada
  const idUsuario = new Types.ObjectId(usuarioId);

  const publicacion = await this.publicacionModel.findOneAndUpdate(
    { _id: id, eliminada: false, likes: { $ne: idUsuario } },   // FILTRO: solo si todavía no dio like
    { $addToSet: { likes: idUsuario } },                         // CAMBIO: agrega el id (sin duplicar)
    { returnDocument: 'after' },                                 // devuelve el documento ya modificado
  );
  if (!publicacion) throw new ConflictException('Ya le diste me gusta a esta publicación');   // 409
  return this.aRespuestaLikes(publicacion);          // { id, likes: [...], cantidadLikes }
}

// quitarLike: filtro { likes: idUsuario } + { $pull: { likes: idUsuario } } → 409 "No le diste me gusta"
```

**Por qué así (lo más preguntable)**
- **Atómico:** la condición ("todavía no dio like") está **en el filtro de la misma operación**, no en un `if` previo. La alternativa ingenua (leer la publicación, comprobar en JS y guardar) tiene una **condición de carrera**: dos pedidos simultáneos podrían pasar ambos la comprobación. Con `findOneAndUpdate` Mongo evalúa filtro y cambio juntos, así que solo uno gana y el otro recibe `null` → 409.
- **Doble seguro:** además del filtro, `$addToSet` por sí mismo no agrega un valor que ya está en el arreglo.
- **`$pull`** quita todas las apariciones del id; con el filtro `likes: idUsuario` solo corre si realmente había dado like.
- **409 y no 400:** la petición está bien formada, pero **choca con el estado actual** (ya dio like / no lo había dado).
- **200 y no 201 en el POST:** no se crea un recurso nuevo; se modifica uno existente (`@HttpCode(HttpStatus.OK)`).
- **Los likes son un arreglo de ids dentro de la publicación** (no una colección aparte): con una sola lectura se sabe quién dio like y cuántos son, y es lo que permite el "un like por usuario" con `$addToSet`. Costo: el documento crece con cada like. Para ordenar por popularidad se calcula `cantidadLikes = $size: '$likes'` en el `aggregate` del listado (ver 3.11).
- **El actor sale del token** (`@UsuarioActual()`), nunca del body: nadie puede dar like en nombre de otro.
- **Límite conocido:** si la publicación se elimina justo entre la comprobación y la actualización, responde 409 en vez de 404.

### 5.11 Baja lógica de una publicación (autor o administrador)

**Idea en una frase:** "eliminar" no borra el documento, solo lo marca `eliminada: true`; puede hacerlo el autor o cualquier administrador.

```
FRONT   PublicacionCard.puedeEliminar = esMia() || esAdministrador()   ─► muestra el botón "Eliminar"
        clic ─► emite `eliminar` ─► el contenedor abre modalService.confirmar("¿Querés eliminar ...?")
        aceptar ─► PublicacionesService.eliminar(id)  =  DELETE /publicaciones/:id   (Bearer)
BACK    PublicacionesController.eliminar ─► PublicacionesService.eliminar(id, usuarioId)
          1. obtenerActivaOFallar(id)      id inválido 400 · inexistente o ya eliminada 404
          2. obtenerUsuarioOFallar(...)    el solicitante sale del token; su perfil se lee DE LA BASE
          3. esAutor = publicacion.usuario === usuarioId ;  esAdministrador = solicitante.perfil === 'administrador'
             [ni una ni otra] 403 "No podés eliminar una publicación de otro usuario"
          4. publicacion.eliminada = true ; save()   ─► 200 { id, eliminada: true }
FRONT   recarga la página actual (o retrocede una si era la única de la última página) + modal de éxito
        (en el detalle: vuelve a /publicaciones)
```

**Qué significa "dejan de estar disponibles" (pide el enunciado):**
- `listar` y `obtener` filtran `eliminada: false` → desaparece de los listados y su detalle da **404**.
- Sus comentarios no se marcan uno por uno: **crear, listar y editar** comentarios de esa publicación responden **404**, porque todas esas operaciones primero buscan la publicación activa.
- Las **estadísticas** también la excluyen (a ella y a sus comentarios).
- Dar o quitar me gusta sobre ella da 404.

**Por qué baja lógica:** el enunciado lo exige (no borrar físicamente), y además conserva el historial y permite recuperarla.

### 5.12 Estadísticas de punta a punta (administrador)

```
Pantalla ─► Desde / Hasta ─► debounce 300 ms ─► ¿lapso válido? [no] modal y NO consulta
   ─► pedidos.next(rango) ─► switchMap (cancela el anterior) ─► forkJoin de 3 GET con ?desde=&hasta=
BACK  JwtAuthGuard (token válido) ─► RolesGuard (@Roles(admin), lee el perfil en la base)   [no admin] 403 · [deshabilitado] 401
   ─► ValidationPipe: RangoFechasDto (fechas ISO válidas) · RangoFechasConLimiteDto (limit 1 a 50, por defecto 10)   [falla] 400
   ─► EstadisticasService.filtroFecha: desde > hasta 400 · hasta posterior a hoy 400
   ─► aggregate(...) ─► 200
FRONT  3 signals ─► computed (etiquetas y valores) ─► <app-grafico tipo="bar|line|pie"> ─► Chart.js
```

**Las tres agregaciones** (`Backend/src/estadisticas/estadisticas.service.ts`). Una **agregación** es un *pipeline*: una cadena de etapas donde la salida de una es la entrada de la siguiente. La base agrupa y cuenta, y devuelve solo el resultado (no se traen todos los documentos para contar en JavaScript).

| Ruta | Método | Pipeline | Gráfico |
|---|---|---|---|
| `/estadisticas/publicaciones-por-usuario` | `publicacionesPorUsuario` | `$match` (no eliminadas + lapso) → `$group` por `usuario` con `$sum: 1` → `$lookup` usuarios → `$unwind` → `$addFields nombreUsuario` → `$sort` (cantidad desc, nombre asc) → `$limit` | Barras |
| `/estadisticas/comentarios` | `comentarios` | `$match` (no eliminados + lapso) → `soloDePublicacionesActivas` → `$group` por día con `$dateToString '%Y-%m-%d'` → `$sort` por fecha; el `total` es la suma de los días | Líneas |
| `/estadisticas/comentarios-por-publicacion` | `comentariosPorPublicacion` | `$match` → `$group` por `publicacion` → `soloDePublicacionesActivas` (agrega el título) → `$sort` → `$limit` | Torta |

- **`soloDePublicacionesActivas`**: un `$lookup` a publicaciones + `$unwind` + `$match 'pub.eliminada': false`. Es lo que hace que los comentarios de una publicación dada de baja **no cuenten**.
- **`filtroFecha`** arma `{ fecha: { $gte: desde, $lt|$lte: hasta } }`. Si `hasta` viene solo como fecha (`2026-11-05`) se incluye **el día entero** (`$lt` del día siguiente); si viene como fecha ISO completa se usa `$lte` del instante. Un solo día se pide con `desde` y `hasta` iguales.
- **Los nombres de colección** de los `$lookup` se piden al modelo (`this.usuarioModel.collection.name`) en vez de escribirse a mano, porque Mongoose pluraliza a su manera.
- **El `sort` tiene desempate** (`nombreUsuario`, `titulo`) para que el orden sea siempre el mismo.
- **Límites:** los días se agrupan en **UTC** (un comentario a la noche en Argentina puede caer en el día siguiente); barras y torta muestran el **top 10** porque el front no manda `limit`.

### 5.13 Editar mi perfil de punta a punta

```
Mi perfil ─► botón "Editar perfil" ─► /perfil/editar (authGuard)
EditarPerfil: el formulario se precarga con los datos de la sesión (authService.usuarioActual())
   hayCambios() ─► "Guardar" solo se habilita si algo cambió (texto, fecha o foto nueva)
   guardar() ─► payload { nombre, apellido, fechaNacimiento, descripcion, imagenPerfil? }
   ─► AuthService.actualizarPerfil(payload) = PUT /usuarios/me   (Bearer)
BACK  JwtAuthGuard ─► ValidationPipe: ActualizarPerfilDto  [campo no permitido o inválido] 400
   ─► PerfilController.actualizar(@UsuarioActual() usuarioId, dto) ─► UsuariosService.actualizarPerfil
        1. el usuario del token existe y está habilitado   [no] 401 "La sesión ya no es válida"
        2. arma `cambios` = nombre, apellido, fechaNacimiento (+ descripcion si vino)
        3. si vino imagenPerfil ─► AlmacenamientoService.subirImagen(..., 'perfiles')  (ver 5.9)
        4. findByIdAndUpdate(id, { $set: cambios }, { returnDocument: 'after' })
   ─► 200 usuario actualizado (aRespuestaUsuario: sin contraseña)
FRONT  tap(actualizarUsuario): reemplaza SOLO el usuario dentro de la sesión (signal + localStorage)
   ─► la navbar y Mi perfil muestran el nombre y la foto nuevos al instante; las publicaciones también,
      porque el autor se une desde la base en cada consulta (`$lookup`), no se copia dentro de la publicación
   ─► modal de éxito + navega a /perfil
```

**Decisiones para explicar**
- **El token no cambia:** solo guarda `sub`, correo, nombre de usuario y perfil, y nada de eso se edita. Por eso `actualizarUsuario` no toca el token ni reprograma el contador de sesión.
- **Qué NO se puede editar:** correo, nombre de usuario (son únicos e identifican a la persona), contraseña y perfil. Si el cliente los manda, el `ValidationPipe` responde 400 (`forbidNonWhitelisted`).
- **`descripcion`:** si no viene, no se toca; si viene vacía (`""`), se borra.
- **Imagen opcional:** si no viene, se conserva la actual.
- **Se sube la imagen después de validar al usuario**, como en el registro, para no dejar imágenes sueltas.
- **El front compara con el original** (`hayCambios`) y no llama al back si no hay nada nuevo, igual que la edición de comentarios.

---

## 6. Pruebas y calidad

- **Postman Sprint #4** (`NextPlay.Sprint4.postman_collection.json`): colección aparte de **34 requests** simples, uno por caso (sin el helper de abajo): preparación (admin, usuario, publicación y comentarios), usuarios de admin (200, 201, 400, 401, 403, 404, 409, login del deshabilitado y admin deshabilitado con token vigente), estadísticas (las 3 rutas, lapsos y errores) y baja de publicación. Es independiente de la anterior y usa los mismos environments.
- **Postman Sprints #1 a #3** (`Backend/postman/`): una colección de **13 requests** y dos environments (**NextPlay - Local**, `localhost:3000`, y **NextPlay - Produccion**, el back de Vercel). La URL sale de `{{baseUrl}}`, así que la misma colección sirve para los dos entornos. Cada request hace el **pedido principal** y, en su pestaña Tests, dispara las **variantes** (400, 401, 403, 404, 409) con pedidos extra (`pm.sendRequest`); cada una queda como un test "caso -> status esperado". Así un solo `GET` muestra 200, 400, 404 y 401, sin un request por caso. El helper que arma y registra esos pedidos vive una vez en el Pre-request Script de la colección y los tests lo cargan con `eval`. Orden: Auth (registro, login, autorizar, refrescar), Publicaciones (crear, listar, detalle, like), Comentarios (comentar, listar, editar) y, al final, Baja (eliminar la publicación y comprobar que sus comentarios dejan de estar disponibles) y Token vencido. Los requests dependen de los anteriores (guardan tokens e ids en variables), por eso se corre entera con "Run collection". El request 13 lee el `exp` del token y espera a que venza solo si faltan 120 s o menos; con `JWT_EXPIRES_IN_SEGUNDOS=900` se omite (`skip`). Las corridas crean datos de prueba reales, y con el token de 30 a 60 s del `.env` local una corrida lenta puede recibir 401.
- **Tests unitarios (verificados el 2026-11-14):** back **80 tests en 13 suites** (Jest), front **73 tests en 12 archivos** (Vitest). Los servicios se prueban con modelos de Mongoose simulados, sin base de datos. Qué cubren:
  - **Back, seguridad:** `JwtAuthGuard` (ruta pública, sin token, esquema distinto de Bearer, token inválido o vencido, token válido que deja el payload en la request); `RolesGuard` (admin habilitado pasa, usuario común 403, admin deshabilitado o inexistente 401); `AuthService.autorizar`/`refrescar` (401 si el usuario no existe, está deshabilitado o el id no es un ObjectId).
  - **Back, negocio:** `PublicacionesService.obtener` (éxito con autor y likes, el pipeline cuenta solo comentarios no eliminados, 400 sin consultar la base, 404); `ComentariosService.actualizar` (éxito, 403, 404 en sus dos variantes, 400); `UsuariosService` (sin hash en las respuestas, baja y alta lógica, 400 de auto-baja e id inválido, 404, y la edición del perfil: nunca modifica correo, usuario, contraseña, perfil ni habilitado, sube la imagen a `perfiles`, 401 si la sesión ya no es válida); `EstadisticasService` (armado del filtro de fechas, `hasta` inclusivo, 400 de rango invertido o `hasta` futura, mapeo de resultados); `ActualizarPerfilDto`, `PerfilController` (sin `@Roles`: cualquier usuario con sesión) y un test HTTP de `PUT /usuarios/me` (200, 400, 401 y 403 en rutas de admin).
  - **Front:** `authInterceptor` (Bearer, 401 que cierra y redirige una sola vez, excepciones del login); `AuthService` (contador de sesión: aviso persistente, cierre al vencer, extender cancela el vencimiento viejo); `EstadisticasService`; componentes `Comentarios`, `MiPerfil`, `EditarPerfil` y `AdminEstadisticas` (lapso, validación de fechas, un solo pedido por ráfaga de cambios); y las 3 directivas y el pipe `tiempoRelativo`.
  - **Brecha a tener presente:** los métodos de **me gusta, quitar me gusta, crear y eliminar publicación** no tienen unit test propio (el spec de `PublicacionesService` y el del controller solo cubren `obtener` y "should be defined"). Esos casos están cubiertos por la colección de Postman (200, 400, 403, 404 y 409) y por las pruebas manuales.
  - Los tests de creación de `AppController` y similares son básicos.
- **Lint** del back con `oxlint` y **build** de ambos proyectos: en verde al 2026-11-14.

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
| `UsuariosController` desactivado | Era un CRUD de prueba sin protección (`GET /usuarios` devolvía el hash de las contraseñas y `PATCH` permitía cambiar el `perfil`). Se quitó de `UsuariosModule` antes del deploy; el servicio y el esquema siguen | Resuelto en el Sprint #4: reactivado con rol administrador (`@Roles`), sin `GET :id` ni `PATCH` y sin devolver el hash |
| Validación del token en el back (resuelto) | `JwtAuthGuard` global: toda ruta exige token salvo `@Public()` (registro, login y `GET /`); `autorizar` y `refrescar` agregan la comprobación contra la base | — |
| Actor tomado del token (resuelto) | Publicaciones y comentarios usan `@UsuarioActual()`; `usuarioId` ya no se acepta (400). Ya no se puede actuar ni hacerse pasar por administrador conociendo un id | — |
| El guard no consulta la base | Verifica firma y vencimiento, pero un usuario deshabilitado (o eliminado) conserva acceso hasta que su token venza (hoy 15 min) | Decisión: el login, `autorizar`, `refrescar` y las rutas de administrador (`RolesGuard`) sí consultan la base; las demás rutas no, porque el enunciado no lo pide. Si hiciera falta cortar de inmediato, el guard podría consultar la base |
| Interceptor del front (resuelto) | Agrega `Bearer` a los pedidos de la API y, ante un 401 en una ruta protegida, cierra la sesión, avisa y va al login. El front ya no manda `usuarioId` | — |
| Duración del token | Es configurable con `JWT_EXPIRES_IN_SEGUNDOS`; se bajó a 30–60 s durante el desarrollo para probar el vencimiento. El `.env` local está en 900 (15 min, lo que pide el enunciado) y producción usa el mismo valor | — |
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
| Imágenes sueltas en Supabase | Si Mongo falla después de subir, o al reemplazar la foto de perfil, el archivo anterior queda en el bucket. Además el tipo se valida por lo que declara el data URL, no por los bytes | Borrar el archivo viejo tras reemplazarlo y verificar el contenido real (ver 5.9) |
| Estadísticas: zona horaria y top 10 | Los días se agrupan en UTC (un comentario nocturno en Argentina puede caer en el día siguiente) y barras y torta muestran solo el top 10 (el front no manda `limit`; el back acepta hasta 50) | Pasar `timezone` a `$dateToString` y ajustar el corte de `desde`/`hasta`; mandar `limit` desde el front |
| Pipe `tiempoRelativo` puro | "hace 5 min" no se actualiza solo mientras la pantalla está abierta | Pipe `pure: false` o un temporizador que refresque (más costo por detección de cambios) |
| PWA sin `SwUpdate` ni `dataGroups` | Tras un deploy, quien ya visitó el sitio ve la versión anterior hasta recargar una o dos veces; sin conexión se ve la interfaz pero no los datos (la API no se cachea) | `SwUpdate` para avisar de la versión nueva y `dataGroups` para cachear lecturas |

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

**¿Cuánto dura el token y se puede probar el vencimiento?** Dura 15 minutos (`JWT_EXPIRES_IN_SEGUNDOS=900`, lo que pide el enunciado). Como es una variable de entorno, para probar el aviso de "sesión por vencer" y el cierre automático se baja a 30 o 60 segundos en el `.env` local, sin tocar código. El aviso sale a un tercio de la vida del token (a los 10 minutos con 900 s).

**¿Qué pasa si se edita un comentario?** `PUT /comentarios/:id` cambia el mensaje y marca `modificado: true`. Solo lo puede hacer el autor (403 si no); la fecha original no cambia y la leyenda "editado" sale de ese campo.

**¿Cómo funciona "cargar más"?** El front pide `offset` = cantidad de comentarios ya mostrados y `limit` = 5, y **agrega** el resultado al final de la lista (no la reemplaza). Descarta los repetidos por id y el botón desaparece cuando ya se mostraron todos (`total`).

**¿Cómo se sabe que un comentario fue editado?** El back pone `modificado: true` en el `PUT` y el front muestra la leyenda "editado" a partir de ese campo; si se edita con el mismo texto, el front ni llama al back.

**¿Por qué existe `GET /publicaciones/:id`?** Para que la página de detalle funcione al recargar o abrir el enlace directamente: la publicación se pide por id en vez de depender de lo que había en el listado.

**¿Cómo se suben las imágenes?** El front lee el archivo con `FileReader.readAsDataURL` y lo manda como texto base64 dentro del JSON. El back (`AlmacenamientoService.subirImagen`) valida el formato y el tamaño (2 MB), la sube a Supabase Storage con `fetch` usando su clave secreta y guarda en Mongo solo la URL pública. Ver 5.9.

**¿Por qué base64 y no `multipart/form-data`?** Multer no se vio en la cursada. El costo es que el body pesa ~33 % más, por eso el límite del JSON se subió a 3 MB.

**¿Cómo funciona el me gusta?** El corazón llama a `POST /publicaciones/:id/like` si todavía no di like o a `DELETE` si ya lo di (el front lo sabe porque mi id está en el arreglo `likes`). El back usa un solo `findOneAndUpdate` con la condición en el filtro (`likes: { $ne: id }` y `$addToSet`; para quitar, `likes: id` y `$pull`). Si la condición no se cumple, 409. Ver 5.10.

**¿Por qué es atómico y por qué importa?** Porque comprobar en JavaScript y después guardar deja una ventana donde dos pedidos simultáneos pasan la comprobación. Con la condición dentro de la operación de Mongo, solo uno la cumple.

**¿Por qué los likes son un arreglo dentro de la publicación y no una colección aparte?** Con una sola lectura se sabe quién dio like y cuántos son, y `$addToSet` garantiza el "uno por usuario". El costo es que el documento crece; a esta escala no importa.

**¿Cómo se ordena por cantidad de me gusta si ese número no existe en la base?** Con un `aggregate` que calcula `cantidadLikes` con `$size` sobre `likes` y ordena por ese campo (`find` no puede ordenar por un valor calculado).

**¿Quién puede eliminar una publicación?** Su autor o un administrador; si no, 403. Es baja lógica (`eliminada: true`): desaparece de los listados, su detalle da 404 y sus comentarios dejan de estar disponibles. Ver 5.11.

**¿Cómo se protege una ruta solo para administradores?** Con `@Roles(PerfilUsuario.ADMINISTRADOR)`, que activa el `RolesGuard`. Corre después del `JwtAuthGuard` y lee el perfil **de la base** y no del token, así que si se le quita el rol a un admin o se lo deshabilita, pierde el acceso en el acto. 403 si el perfil no alcanza, 401 si el usuario ya no existe o está deshabilitado.

**¿Qué hace el administrador en el front?** El `adminGuard` cierra las rutas `/admin/...`, la directiva `*appSoloAdmin` oculta los enlaces de la navbar y el botón "Eliminar" aparece en cualquier publicación. Todo eso es comodidad de interfaz: la seguridad real la hace el back.

**¿Cómo se deshabilita un usuario?** `DELETE /usuarios/:id` pone `habilitado: false` (no borra nada). Un admin no puede deshabilitarse a sí mismo (400). El usuario deshabilitado recibe 401 "El usuario se encuentra deshabilitado" al intentar el login y se puede volver a habilitar con `POST /usuarios/:id/habilitar`.

**¿Cómo se calculan las estadísticas?** Con pipelines de agregación de MongoDB (`$match` → `$group` → `$lookup` → `$sort` → `$limit`): la base agrupa y cuenta, y devuelve solo el resultado. Aceptan un lapso `desde`/`hasta`, excluyen publicaciones dadas de baja y comentarios eliminados. Ver 5.12.

**¿Para qué sirven `switchMap` y `forkJoin` en el dashboard?** `forkJoin` lanza los tres pedidos juntos y espera a los tres, así los gráficos comparten el mismo lapso. `switchMap` cancela el pedido anterior si el usuario cambia las fechas antes de que termine, así nunca queda un dato viejo en pantalla. Ver 4.14.

**¿Qué diferencia hay entre un pipe y una directiva?** Un pipe transforma un valor para mostrarlo (`{{ fecha | tiempoRelativo }}`); una directiva cambia el comportamiento, el aspecto o la estructura de un elemento. Propios: pipes `iniciales`, `estadoUsuario`, `tiempoRelativo`; directivas `*appSoloAdmin` (estructural), `appPastillaPerfil` y `appContadorCaracteres` (de atributo). Ver 4.15.

**¿Qué es una directiva estructural?** La que agrega o quita elementos del DOM (`*appSoloAdmin`, como `@if`). Usa `TemplateRef` (qué dibujar) y `ViewContainerRef` (dónde dibujarlo).

**¿Qué es una PWA y qué hace la de NextPlay?** Una web instalable que abre sin conexión. Tiene manifest, íconos, y un service worker (`provideServiceWorker`, solo en producción) que cachea la interfaz. No cachea la API, así que sin conexión se ve la pantalla pero no los datos. Ver 4.16.

**¿Cómo se edita el perfil?** `PUT /usuarios/me`: el id sale del token, solo se pueden cambiar nombre, apellido, fecha de nacimiento, descripción y foto (lo demás da 400) y el token no se reemplaza porque no contiene nada editable. Ver 5.13.
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
| **Likes y quitar like (back)** | `darLike` y `quitarLike` en `Backend/src/publicaciones/publicaciones.service.ts` (rutas en `publicaciones.controller.ts`) |
| **Likes (front)** | `alternarLike` en `componentes/publicaciones/publicaciones.ts` y `publicacion-detalle/publicacion-detalle.ts`; el corazón en `componentes/publicacion/`; `darLike`/`quitarLike` en `services/publicaciones.ts` |
| **Baja lógica de publicación** | `eliminar` en `publicaciones.service.ts` (back); `puedeEliminar` en `componentes/publicacion/publicacion.ts` (front) |
| **Selección y lectura de la imagen (front)** | `seleccionarImagen` en `registro.ts`, `admin-alta-usuario.ts`, `nueva-publicacion.ts` y `editar-perfil.ts` |
| **Subida a Supabase (back)** | `AlmacenamientoService.subirImagen` (lo llaman `AuthService.crearUsuario`, `PublicacionesService.crear` y `UsuariosService.actualizarPerfil`) |
| Roles de administrador | `Backend/src/auth/roles.guard.ts` y `decoradores/roles.decorator.ts`; front: `guards/admin-guard.ts` y `directives/solo-admin-directive.ts` |
| Usuarios para administradores | `Backend/src/usuarios/usuarios.controller.ts` y `usuarios.service.ts`; front: `componentes/admin-usuarios/` y `admin-alta-usuario/` |
| Editar mi perfil | `Backend/src/usuarios/perfil.controller.ts`, `UsuariosService.actualizarPerfil` y `dto/actualizar-perfil.dto.ts`; front: `componentes/editar-perfil/` y `AuthService.actualizarPerfil` |
| Estadísticas (back) | `Backend/src/estadisticas/estadisticas.service.ts` y `dto/rango-fechas.dto.ts` |
| Dashboard y gráficos (front) | `componentes/admin-estadisticas/`, `componentes/grafico/` y `services/estadisticas.ts` |
| Pipes y directivas propias | `Frontend/src/app/pipes/` y `Frontend/src/app/directives/` |
| PWA | `Frontend/public/manifest.webmanifest`, `Frontend/ngsw-config.json` y `provideServiceWorker` en `app/app.config.ts` |
| Sesión: aviso de vencimiento y cierre automático | `iniciarContadorSesion` en `services/auth.ts` |
