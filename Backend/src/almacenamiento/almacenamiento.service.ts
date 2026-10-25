import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

export const TAMANO_MAXIMO_IMAGEN_MB = 2;
const TAMANO_MAXIMO_BYTES = TAMANO_MAXIMO_IMAGEN_MB * 1024 * 1024;

const EXTENSIONES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// data:image/png;base64,AAAA...
const PATRON_DATA_URL = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/;

// Sube imágenes a Supabase Storage usando su API REST (sin Multer ni SDK).
@Injectable()
export class AlmacenamientoService {
  private readonly url: string;
  private readonly claveSecreta: string;
  private readonly bucket: string;

  constructor(configService: ConfigService) {
    this.url = configService.getOrThrow<string>('SUPABASE_URL');
    this.claveSecreta = configService.getOrThrow<string>('SUPABASE_SECRET_KEY');
    this.bucket = configService.getOrThrow<string>('SUPABASE_BUCKET');
  }

  // Recibe la imagen como data URL en base64 y devuelve su URL pública.
  async subirImagen(dataUrl: string, carpeta: string): Promise<string> {
    const coincidencia = PATRON_DATA_URL.exec(dataUrl);
    const tipo = coincidencia?.[1];
    if (!coincidencia || !tipo || !EXTENSIONES[tipo]) {
      throw new BadRequestException(
        'La imagen debe ser un archivo JPG, PNG o WEBP',
      );
    }

    const contenido = Buffer.from(coincidencia[2], 'base64');
    if (contenido.length > TAMANO_MAXIMO_BYTES) {
      throw new BadRequestException(
        `La imagen no puede superar los ${TAMANO_MAXIMO_IMAGEN_MB} MB`,
      );
    }

    const ruta = `${carpeta}/${randomUUID()}.${EXTENSIONES[tipo]}`;
    const respuesta = await fetch(
      `${this.url}/storage/v1/object/${this.bucket}/${ruta}`,
      {
        method: 'POST',
        headers: {
          apikey: this.claveSecreta,
          Authorization: `Bearer ${this.claveSecreta}`,
          'Content-Type': tipo,
        },
        body: contenido,
      },
    ).catch(() => null);

    if (!respuesta?.ok) {
      throw new InternalServerErrorException(
        'No se pudo guardar la imagen. Intentá nuevamente más tarde.',
      );
    }

    return `${this.url}/storage/v1/object/public/${this.bucket}/${ruta}`;
  }
}
