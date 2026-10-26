# NextPlay – Guía técnica para estudiar y explicar el código

Documento de estudio del TP #2 (Programación IV, UTN Avellaneda). Cubre lo implementado hasta el **Sprint #1** (base, registro y login). Está pensado para que puedas explicar **qué hace cada pieza, por qué se hizo así y qué pasa de punta a punta** cuando un usuario se registra o inicia sesión.

> Convención de este documento: las rutas de archivo son relativas a la raíz del repositorio. Todo lo que dice "hoy" se refiere al estado del Sprint #1; lo que viene en los sprints siguientes se marca como _pendiente_.

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
| Base de datos | MongoDB (Atlas) + Mongoose | Persistencia de usuarios (y luego publicaciones) |
| Imágenes | Supabase Storage (API REST) | Guardar las fotos de perfil y devolver una URL pública |
| Autenticación | JWT (`@nestjs/jwt`) | Identificar al usuario en cada petición (se usa del lado del servidor a partir del Sprint #3) |

**Qué hace hoy la app (Sprint #1):** registrarse (con foto opcional), iniciar sesión con correo **o** nombre de usuario, ver una pantalla de Publicaciones (esqueleto), ver Mi perfil, cerrar sesión. Las rutas privadas están protegidas con guards.

---

## 2. Estructura del repositorio

```
TP2PrograIV/
├── GUIA_TECNICA.md          Este documento
├── Backend/                 NestJS
│   ├── README.md            Fuente de verdad del proyecto: enunciado, sprints y estado
│   ├── Funcional.md         Descripción funcional / "pitch" de NextPlay
│   ├── postman/             Colección con los casos de Auth probados
│   ├── .env.example         Variables de entorno necesarias
│   └── src/
│       ├── main.ts          Arranque: CORS, límite del body, ValidationPipe global
│       ├── app.module.ts    Módulo raíz: Config, Mongo y módulos de la app
│       ├── auth/            Registro y login (controller, service, DTOs, hasher)
│       ├── usuarios/        Esquema de Usuario + CRUD de prueba
│       ├── publicaciones/   Solo esquema y módulo (el resto es Sprint #2)
│       └── almacenamiento/  Subida de imágenes a Supabase
└── Frontend/                Angular
    ├── vercel.json          Configuración de deploy
    └── src/
        ├── environments/    URL de la API según entorno
        └── app/
            ├── componentes/ login, registro, publicaciones, mi-perfil, navbar, modal
            ├── guards/      authGuard, guestGuard
            ├── services/    AuthService, ModalService
            ├── models/      Interfaces TypeScript
            └── utils/       Validadores propios y helper de errores
```

---

## 3. Backend (NestJS)

### 3.1 Conceptos de NestJS que se usan

| Concepto | Qué es | Dónde está en el proyecto |
|---|---|---|
| **Módulo** (`@Module`) | Agrupa controllers y providers de una funcionalidad | `AuthModule`, `UsuariosModule`, `PublicacionesModule`, `AlmacenamientoModule` |
| **Controller** (`@Controller`) | Recibe la petición HTTP y delega; no tiene lógica de negocio | `AuthController` |
| **Provider / Service** (`@Injectable`) | Contiene la lógica; se inyecta por constructor | `AuthService`, `PasswordHasher`, `AlmacenamientoService` |
| **DTO** | Clase que describe y valida el cuerpo de una petición | `RegistroDto`, `LoginDto` |
| **Pipe** | Transforma/valida datos antes de llegar al controller | `ValidationPipe` global en `main.ts` |
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

`Backend/src/publicaciones/publicacion.schema.ts` ya define `titulo`, `mensaje`, `imagenUrl?`, `usuario` (referencia a Usuario), `fecha`, `likes` (array de ids) y `eliminada` (baja lógica). Todavía no tiene controller ni service.

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

### 3.8 JWT: dentro de `AuthService.construirRespuesta` y `AuthModule`

- `JwtModule.registerAsync` firma con `JWT_SECRET` y define el vencimiento: `JWT_EXPIRES_IN_MINUTOS * 60` (la librería espera segundos). Por defecto **15 minutos**, como pide el enunciado.
- `global: true` permite inyectar `JwtService` en cualquier módulo sin reimportar.
- **Payload** del token: `sub` (id del usuario), `correo`, `nombreUsuario`, `perfil` (el rol). `sub` es el nombre estándar de JWT para el "sujeto".
- Un JWT son tres partes en base64url: `header.payload.firmaHMAC`. El payload **se puede leer** (no es secreto); lo que no se puede es **modificarlo sin la clave** porque la firma dejaría de coincidir. Por eso nunca se guardan datos sensibles en el payload.
- **Estado actual:** el back **emite** el token, pero todavía no lo **valida** en ninguna ruta. Eso llega en el Sprint #3 (`JwtAuthGuard`, `/auth/autorizar`, `/auth/refrescar`).

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

### 3.11 Variables de entorno (`Backend/.env.example`)

| Variable | Uso |
|---|---|
| `MONGODB_URI` | Cadena de conexión a Atlas |
| `PORT` | Puerto del servidor (el hosting suele asignarlo) |
| `JWT_SECRET` | Clave con que se firman los tokens. Si se filtra, cualquiera puede fabricar tokens válidos |
| `JWT_EXPIRES_IN_MINUTOS` | Vida del token (15) |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_BUCKET` | Almacenamiento de imágenes |
| `CORS_ORIGIN` | Dominio(s) del front permitidos |

El `.env` real **no se sube a git** (está en `.gitignore`); solo el `.env.example` sin valores reales.

---

## 4. Frontend (Angular 22)

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
- `app.config.ts` registra `provideRouter(routes)` y `provideHttpClient()` (sin interceptores todavía).
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
| `/` | redirige a `/publicaciones` | — |
| `/login`, `/registro` | Login, Registro | `guestGuard` (solo sin sesión) |
| `/publicaciones`, `/perfil` | Publicaciones, MiPerfil | `authGuard` (requiere sesión) |
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
- `obtenerToken()` queda listo para el interceptor del Sprint #3.
- `leerSesionGuardada()` está en `try/catch`: si alguien modificó el `localStorage` y el JSON está roto, se borra y se arranca sin sesión en vez de romper la app.

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
- Click en el fondo cierra el modal; el `stopPropagation` en la caja evita que un click dentro también lo cierre.
- Ejemplo de confirmación: cerrar sesión en la navbar llama a `modalService.confirmar('¿Querés cerrar tu sesión?', () => {...})`.

### 4.7 Navbar y pantallas

- **Navbar**: muestra enlaces distintos según `estaAutenticado()` (Ingresar/Crear cuenta vs. Publicaciones/Mi perfil/Cerrar sesión). `routerLinkActive` marca el enlace activo.
- **Mi perfil**: muestra foto (o iniciales si no hay) y datos del `usuarioActual()`. Se usa `&#64;` para escribir el carácter `@` en el template, porque en Angular moderno `@` inicia un bloque de control flow.
- **Publicaciones**: esqueleto; el botón "Nueva publicación" está deshabilitado hasta el Sprint #2.

### 4.8 Environments y build

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

### 5.2 Login

```
Form ─► POST /auth/login { usuarioOCorreo, contrasena }
        Nest: buscar por correo (minúsculas) o nombreUsuario
              [no existe / clave mala] ─► 401 mensaje genérico
              [deshabilitado]          ─► 401 deshabilitado
        200 { usuario, token } ─► guardar sesión ─► /publicaciones
```

### 5.3 Recarga de página con sesión activa

`AuthService` se instancia, lee `localStorage`, el signal queda cargado y `authGuard` deja pasar sin volver a pedir login.

### 5.4 Códigos HTTP usados

| Código | Cuándo |
|---|---|
| 200 | Login correcto |
| 201 | Registro correcto |
| 400 | Validación fallida, contraseñas distintas, imagen inválida o muy pesada, propiedades no permitidas |
| 401 | Credenciales incorrectas o usuario deshabilitado |
| 409 | Correo o nombre de usuario ya registrado |
| 500 | Falla al subir la imagen a Supabase |

---

## 6. Pruebas y calidad

- **Postman** (`Backend/postman/NextPlay.postman_collection.json`): 6 casos de Auth (registro 201, correo duplicado 409, contraseña débil 400, login por correo 200, login por usuario 200, contraseña incorrecta 401).
- **Tests unitarios:** back 3 (Jest), front 2 (Vitest). Son básicos (creación de controller/service/app). La cobertura real se probó manualmente y con requests directos (ver README). Es un punto a ampliar.
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
| El back no valida el token | Se emite pero ninguna ruta lo exige | Sprint #3: `JwtAuthGuard`, `/auth/autorizar`, `/auth/refrescar` |
| `authGuard` solo mira `localStorage` | Un token vencido sigue habilitando las pantallas | Sprint #3: pantalla "Cargando" que valida el token + interceptor que ante un 401 redirige al login |
| Token en `localStorage` | Es simple y suficiente para el TP; es vulnerable si hay XSS (Angular escapa el HTML por defecto, lo que mitiga el riesgo) | Alternativa: cookie `HttpOnly` |
| Autoselección de `administrador` en el registro | Cualquiera puede registrarse como administrador | Lo pide el enunciado del Sprint #1; en un sistema real el alta de admins sería restringida |
| Carrera en el registro | Dos registros simultáneos con el mismo correo pasan el chequeo; el índice único de Mongo frena al segundo, pero devolvería un 500 en vez de un 409 | Capturar el error de clave duplicada (código 11000) y convertirlo en `ConflictException` |
| Imagen en base64 dentro del JSON | Más pesado que `multipart/form-data` y exige subir el límite del body | Se eligió porque Multer no se vio en la cursada |
| `scryptSync` | Bloquea el hilo unos ms | Usar `scrypt` asíncrono si hubiera mucha carga |
| CORS en producción | `CORS_ORIGIN` todavía no está definida en el back de Vercel, así que acepta cualquier origen | Definirla con `https://nextplaygaming.vercel.app` y redeployar el back (ver "Próximo paso" en `Backend/README.md`) |
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

**¿Qué falta para cerrar el Sprint #1?** El deploy en Vercel ya está hecho (front: `https://nextplaygaming.vercel.app`, back: `https://nextplay-delta.vercel.app`). Solo falta definir `CORS_ORIGIN` en el back para restringir el acceso al dominio del front.

---

## 9. Mapa rápido de archivos clave (para repasar)

| Quiero explicar… | Archivo |
|---|---|
| Arranque, CORS y validación global | `Backend/src/main.ts` |
| Reglas de validación del registro | `Backend/src/auth/dto/registro.dto.ts` |
| Lógica de registro/login y JWT | `Backend/src/auth/auth.service.ts` |
| Hash de contraseñas | `Backend/src/auth/password-hasher.ts` |
| Subida de imágenes | `Backend/src/almacenamiento/almacenamiento.service.ts` |
| Modelo de usuario | `Backend/src/usuarios/usuario.schema.ts` |
| Sesión del lado del cliente | `Frontend/src/app/services/auth.ts` |
| Formulario de registro | `Frontend/src/app/componentes/registro/registro.ts` |
| Protección de rutas | `Frontend/src/app/guards/` y `Frontend/src/app/app.routes.ts` |
| Modales | `Frontend/src/app/services/modal.ts` y `componentes/modal/` |
| Deploy del front | `Frontend/vercel.json` y `Frontend/src/environments/` |
