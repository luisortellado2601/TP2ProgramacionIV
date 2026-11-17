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
└── GUIA_TECNICA.md  Explicación del código para estudiar
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
- [GUIA_TECNICA.md](GUIA_TECNICA.md): cómo funciona cada pieza, de punta a punta.
- [Backend/Funcional.md](Backend/Funcional.md): descripción funcional.
