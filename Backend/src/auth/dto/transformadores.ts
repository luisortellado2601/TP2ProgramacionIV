import { TransformFnParams } from 'class-transformer';

export const recortar = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

export const recortarYMinusculas = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
