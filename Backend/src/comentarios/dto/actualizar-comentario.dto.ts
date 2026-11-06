import { CrearComentarioDto } from './crear-comentario.dto.js';

// Editar un comentario solo cambia el mensaje, con las mismas reglas que al crearlo.
export class ActualizarComentarioDto extends CrearComentarioDto {}
