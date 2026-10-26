import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Publicacion, PublicacionSchema } from './publicacion.schema.js';

// Sprint #1: solo creación del módulo y el esquema.
// El controller/service (alta, listado, likes) se implementa en el Sprint #2.
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Publicacion.name, schema: PublicacionSchema },
    ]),
  ],
})
export class PublicacionesModule {}
