import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { UsuariosService } from './usuarios.service.js';
import { Usuario } from './usuario.schema.js';

@Controller('usuarios')
export class UsuariosController {
    constructor(private readonly usuariosService: UsuariosService) {}

    @Get()
    getAll(): Promise<Usuario[]> {
        return this.usuariosService.getAll();
    }

    @Get(':id')
    getById(@Param('id') id: string): Promise<Usuario> {
        return this.usuariosService.getById(id);
    }

    @Post()
    create(@Body() createUsuarioDto: any): Promise<Usuario> {
        return this.usuariosService.create(createUsuarioDto);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateUsuarioDto: any): Promise<Usuario> {
        return this.usuariosService.update(id, updateUsuarioDto);
    }

    @Delete(':id')
    delete(@Param('id') id: string): Promise<Usuario> {
        return this.usuariosService.delete(id);
    }
}
