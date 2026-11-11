import type { UsuarioDocument } from './usuario.schema.js';

// Forma pública de un usuario: nunca incluye el hash de la contraseña.
export function aRespuestaUsuario(usuario: UsuarioDocument) {
  return {
    id: usuario._id.toString(),
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    correo: usuario.correo,
    nombreUsuario: usuario.nombreUsuario,
    fechaNacimiento: usuario.fechaNacimiento,
    descripcion: usuario.descripcion,
    imagenPerfilUrl: usuario.imagenPerfilUrl,
    perfil: usuario.perfil,
    habilitado: usuario.habilitado,
    fechaAlta: usuario.fechaAlta,
  };
}
