import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Busqueda, BusquedaSchema } from './busqueda.schema.js';
import { Usuario, UsuarioSchema } from '../usuarios/usuario.schema.js';
import { BusquedasController } from './busquedas.controller.js';
import { BusquedasService } from './busquedas.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Busqueda.name, schema: BusquedaSchema },
      { name: Usuario.name, schema: UsuarioSchema },
    ]),
  ],
  controllers: [BusquedasController],
  providers: [BusquedasService],
})
export class BusquedasModule {}
