import { SetMetadata } from '@nestjs/common';

export const ES_PUBLICA = 'esPublica';

export const Public = () => SetMetadata(ES_PUBLICA, true);
