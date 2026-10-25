import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export enum PerfilUsuario {
  USUARIO = 'usuario',
  ADMINISTRADOR = 'administrador',
}

export type UsuarioDocument = HydratedDocument<Usuario>;

@Schema()
export class Usuario {
  @Prop({ required: true })
  nombre: string;

  @Prop({ required: true })
  apellido: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  correo: string;

  @Prop({ required: true, unique: true, trim: true })
  nombreUsuario: string;

  @Prop({ required: true })
  contrasena: string;

  @Prop({ required: true })
  fechaNacimiento: Date;

  @Prop()
  descripcion?: string;

  @Prop()
  imagenPerfilUrl?: string;

  @Prop({ enum: PerfilUsuario, default: PerfilUsuario.USUARIO })
  perfil: PerfilUsuario;

  @Prop({ default: true })
  habilitado: boolean;

  @Prop({ default: Date.now })
  fechaAlta: Date;
}

export const UsuarioSchema = SchemaFactory.createForClass(Usuario);
