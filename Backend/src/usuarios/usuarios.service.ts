import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Usuario, UsuarioDocument } from './usuario.schema.js';

@Injectable()
export class UsuariosService {
    constructor(
        @InjectModel(Usuario.name)
        private readonly usuarioModel: Model<UsuarioDocument>,
    ) {}

    async getAll(): Promise<Usuario[]> {
        return this.usuarioModel.find().exec();
    }

    async getById(id: string): Promise<Usuario> {
        const usuario = await this.usuarioModel.findById(id).exec();
        if (!usuario) {
            throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
        }
        return usuario;
    }

    async create(createUsuarioDto: any): Promise<Usuario> {
        return this.usuarioModel.create(createUsuarioDto);
    }

    async update(id: string, updateUsuarioDto: any): Promise<Usuario> {
        const usuario = await this.usuarioModel
            .findByIdAndUpdate(id, updateUsuarioDto, { new: true })
            .exec();
        if (!usuario) {
            throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
        }
        return usuario;
    }

    async delete(id: string): Promise<Usuario> {
        // Baja lógica: el README prohíbe borrar usuarios físicamente.
        const usuario = await this.usuarioModel
            .findByIdAndUpdate(id, { habilitado: false }, { new: true })
            .exec();
        if (!usuario) {
            throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
        }
        return usuario;
    }
}
