import { IsMongoId } from 'class-validator';

// Identifica quién elimina o da/quita like hasta que el Sprint #3 lo resuelva
// con el JWT validado en un guard.
export class UsuarioAccionDto {
  @IsMongoId({ message: 'El usuario no es válido' })
  usuarioId: string;
}
