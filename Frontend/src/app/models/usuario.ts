export enum PerfilUsuario {
  USUARIO = 'usuario',
  ADMINISTRADOR = 'administrador',
}

export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  correo: string;
  nombreUsuario: string;
  fechaNacimiento: string;
  descripcion?: string;
  imagenPerfilUrl?: string;
  perfil: PerfilUsuario;
  habilitado: boolean;
  fechaAlta: string;
}

export interface SesionResponse {
  usuario: Usuario;
  token: string;
}

export interface RegistroPayload {
  nombre: string;
  apellido: string;
  correo: string;
  nombreUsuario: string;
  contrasena: string;
  repetirContrasena: string;
  fechaNacimiento: string;
  descripcion?: string;
  perfil?: PerfilUsuario;
  imagenPerfil?: string; // data URL en base64
}

export interface LoginPayload {
  usuarioOCorreo: string;
  contrasena: string;
}
