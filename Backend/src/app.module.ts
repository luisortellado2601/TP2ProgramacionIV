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
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAuthGuard } from './auth/jwt-auth.guard.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI ?? 'mongodb://localhost/tp2-progra-iv',
    ),
    UsuariosModule,
    AuthModule,
    PublicacionesModule,
    ComentariosModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Guard global: toda ruta exige JWT salvo las marcadas con @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
