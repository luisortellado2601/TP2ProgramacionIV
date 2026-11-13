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

// Lo que el usuario puede cambiar de su propio perfil (PUT /usuarios/me). Correo, nombre de usuario,
// contraseña y perfil no se editan. Sin `imagenPerfil` se conserva la foto actual.
export interface ActualizarPerfilPayload {
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
  descripcion?: string;
  imagenPerfil?: string; // data URL en base64
}
