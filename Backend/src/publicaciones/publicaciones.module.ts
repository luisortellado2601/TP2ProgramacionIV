import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Publicacion, PublicacionSchema } from './publicacion.schema.js';
import { Usuario, UsuarioSchema } from '../usuarios/usuario.schema.js';
import { Comentario, ComentarioSchema } from '../comentarios/comentario.schema.js';
import { PublicacionesController } from './publicaciones.controller.js';
import { PublicacionesService } from './publicaciones.service.js';
import { AlmacenamientoModule } from '../almacenamiento/almacenamiento.module.js';

@Module({
  imports: [
    AlmacenamientoModule,
    MongooseModule.forFeature([
      { name: Publicacion.name, schema: PublicacionSchema },
      { name: Usuario.name, schema: UsuarioSchema },
      { name: Comentario.name, schema: ComentarioSchema },
    ]),
  ],
  controllers: [PublicacionesController],
  providers: [PublicacionesService],
})
export class PublicacionesModule {}
