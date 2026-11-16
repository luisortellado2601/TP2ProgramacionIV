import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { createObserveModule } from '@nestjs/observe';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UsuariosModule } from './usuarios/usuarios.module.js';
import { AuthModule } from './auth/auth.module.js';
import { PublicacionesModule } from './publicaciones/publicaciones.module.js';
import { ComentariosModule } from './comentarios/comentarios.module.js';
import { EstadisticasModule } from './estadisticas/estadisticas.module.js';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAuthGuard } from './auth/jwt-auth.guard.js';
import { Usuario, UsuarioSchema } from './usuarios/usuario.schema.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI ?? 'mongodb://localhost/tp2-progra-iv',
    ),
    // JwtAuthGuard (guard global) consulta el estado del usuario en cada pedido.
    MongooseModule.forFeature([{ name: Usuario.name, schema: UsuarioSchema }]),
    UsuariosModule,
    AuthModule,
    PublicacionesModule,
    ComentariosModule,
    EstadisticasModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Guard global: toda ruta exige JWT salvo las marcadas con @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
