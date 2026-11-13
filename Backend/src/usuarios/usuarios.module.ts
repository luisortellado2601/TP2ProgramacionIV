import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsuariosController } from './usuarios.controller.js';
import { PerfilController } from './perfil.controller.js';
import { UsuariosService } from './usuarios.service.js';
import { Usuario, UsuarioSchema } from './usuario.schema.js';
import { AuthModule } from '../auth/auth.module.js';
import { AlmacenamientoModule } from '../almacenamiento/almacenamiento.module.js';

@Module({
  imports: [
    AuthModule,
    AlmacenamientoModule,
    MongooseModule.forFeature([{ name: Usuario.name, schema: UsuarioSchema }]),
  ],
  controllers: [UsuariosController, PerfilController],
  providers: [UsuariosService],
})
export class UsuariosModule {}
