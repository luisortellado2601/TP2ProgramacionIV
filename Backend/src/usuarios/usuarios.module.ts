import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsuariosService } from './usuarios.service';
import { Usuario, UsuarioSchema } from './usuario.schema';

// UsuariosController (CRUD de prueba) está desactivado hasta el Sprint #4: sin
// guard devolvía todos los usuarios con el hash de la contraseña. Se vuelve a
// registrar en `controllers` cuando tenga guard JWT + rol administrador.
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Usuario.name, schema: UsuarioSchema }]),
  ],
  providers: [UsuariosService],
})
export class UsuariosModule {}
