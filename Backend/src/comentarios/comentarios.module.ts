import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Comentario, ComentarioSchema } from './comentario.schema.js';
import {
  Publicacion,
  PublicacionSchema,
} from '../publicaciones/publicacion.schema.js';
import { Usuario, UsuarioSchema } from '../usuarios/usuario.schema.js';
import { ComentariosController } from './comentarios.controller.js';
import { ComentariosService } from './comentarios.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Comentario.name, schema: ComentarioSchema },
      { name: Publicacion.name, schema: PublicacionSchema },
      { name: Usuario.name, schema: UsuarioSchema },
    ]),
  ],
  controllers: [ComentariosController],
  providers: [ComentariosService],
})
export class ComentariosModule {}
