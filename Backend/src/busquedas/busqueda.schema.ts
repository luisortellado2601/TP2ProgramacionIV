import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema()
export class RespuestaBusqueda {
  @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true })
  usuario: Types.ObjectId;

  @Prop({ required: true })
  mensaje: string;

  @Prop({ default: Date.now })
  fecha: Date;
}

export const RespuestaBusquedaSchema =
  SchemaFactory.createForClass(RespuestaBusqueda);

export type BusquedaDocument = HydratedDocument<Busqueda>;

@Schema()
export class Busqueda {
  @Prop({ required: true })
  juego: string;

  @Prop({ required: true })
  region: string;

  @Prop({ required: true })
  plataforma: string;

  @Prop()
  descripcion?: string;

  @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true })
  usuario: Types.ObjectId;

  @Prop({ type: [RespuestaBusquedaSchema], default: [] })
  respuestas: RespuestaBusqueda[];

  @Prop({ default: Date.now })
  fecha: Date;

  @Prop({ default: true })
  activa: boolean;
}

export const BusquedaSchema = SchemaFactory.createForClass(Busqueda);
BusquedaSchema.index({ activa: 1, fecha: -1 });
