import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ComentarioDocument = HydratedDocument<Comentario>;

@Schema()
export class Comentario {
  @Prop({ type: Types.ObjectId, ref: 'Publicacion', required: true })
  publicacion: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true })
  usuario: Types.ObjectId;

  @Prop({ required: true })
  mensaje: string;

  @Prop({ default: Date.now })
  fecha: Date;

  @Prop({ default: false })
  modificado: boolean;

  @Prop({ default: false })
  eliminado: boolean;
}

export const ComentarioSchema = SchemaFactory.createForClass(Comentario);

// Los comentarios siempre se piden por publicación, del más reciente al más viejo.
ComentarioSchema.index({ publicacion: 1, fecha: -1 });
