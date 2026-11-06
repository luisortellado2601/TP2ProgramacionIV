import { SetMetadata } from '@nestjs/common';

export const ES_PUBLICA = 'esPublica';

// Marca una ruta como accesible sin token. Todas las demás exigen JWT
// porque JwtAuthGuard está registrado como guard global.
export const Public = () => SetMetadata(ES_PUBLICA, true);
