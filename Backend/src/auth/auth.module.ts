import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { Usuario, UsuarioSchema } from '../usuarios/usuario.schema.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PasswordHasher } from './password-hasher.js';
import { AlmacenamientoModule } from '../almacenamiento/almacenamiento.module.js';

@Module({
  imports: [
    AlmacenamientoModule,
    MongooseModule.forFeature([{ name: Usuario.name, schema: UsuarioSchema }]),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          // jsonwebtoken espera segundos; en el .env guardamos minutos.
          expiresIn:
            configService.get<number>('JWT_EXPIRES_IN_MINUTOS', 15) * 60,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PasswordHasher],
})
export class AuthModule {}
