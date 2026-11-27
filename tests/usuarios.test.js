
import request from 'supertest';
import app from '../src/app.js';

import {
    limparBanco,
    criarUsuario,
    criarOrganizador,
    criarCategoria,
    criarLocal,
    criarEvento,
} from './setup.js';

beforeEach(async () => {
    await limparBanco();
});

async function fazerLogin(email) {
    const res = await request(app)
        .post('/api/auth/login')
        .send({
            email,
            senha: 'senha123',
        });

    expect(res.status).toBe(200);

    return res.body.token;
}

describe('Usuários', () => {
    it('deve listar usuários como organizador', async () => {
        await criarOrganizador();
        await criarUsuario();

        const token = await fazerLogin('organizador@teste.com');

        const res = await request(app)
            .get('/api/usuarios')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(2);
    });

    it('não deve permitir que participante liste usuários', async () => {
        await criarUsuario();

        const token = await fazerLogin('usuario@teste.com');

        const res = await request(app)
            .get('/api/usuarios')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(403);
    });

    it('deve buscar o próprio usuário', async () => {
        const usuario = await criarUsuario();
        const token = await fazerLogin('usuario@teste.com');

        const res = await request(app)
            .get(`/api/usuarios/${usuario.id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.data.email).toBe('usuario@teste.com');
    });

    it('não deve permitir que participante consulte outro usuário', async () => {
        await criarUsuario();
        const outro = await criarUsuario(false, 'outro@teste.com');

        const token = await fazerLogin('usuario@teste.com');

        const res = await request(app)
            .get(`/api/usuarios/${outro.id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(403);
    });

    it('deve retornar 400 para ID inválido', async () => {
        const usuario = await criarUsuario();
        const token = await fazerLogin('usuario@teste.com');

        const res = await request(app)
            .get('/api/usuarios/abc')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(400);
    });

    it('deve retornar 404 para usuário inexistente', async () => {
        const usuario = await criarUsuario();
        const token = await fazerLogin('usuario@teste.com');

        const res = await request(app)
            .get('/api/usuarios/99999')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
    });

    it('deve atualizar o próprio perfil', async () => {
        const usuario = await criarUsuario();
        const token = await fazerLogin('usuario@teste.com');

        const res = await request(app)
            .put(`/api/usuarios/${usuario.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                nome: 'Nome Atualizado',
                telefone: '11999999999',
            });

        expect(res.status).toBe(200);
        expect(res.body.data.nome).toBe('Nome Atualizado');
    });

    it('não deve permitir atualizar outro usuário como participante', async () => {
        await criarUsuario();
        const outro = await criarUsuario(false, 'outro@teste.com');

        const token = await fazerLogin('usuario@teste.com');

        const res = await request(app)
            .put(`/api/usuarios/${outro.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                nome: 'Nome Alterado',
            });

        expect(res.status).toBe(403);
    });

    it('não deve permitir alterar o próprio papel', async () => {
        const usuario = await criarUsuario();
        const token = await fazerLogin('usuario@teste.com');

        const res = await request(app)
            .put(`/api/usuarios/${usuario.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                papel: 'ORGANIZADOR',
            });

        expect(res.status).toBe(400);
    });

    it('não deve permitir atualização vazia', async () => {
        const usuario = await criarUsuario();
        const token = await fazerLogin('usuario@teste.com');

        const res = await request(app)
            .put(`/api/usuarios/${usuario.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({});

        expect(res.status).toBe(400);
    });

    it('deve retornar 409 ao atualizar para um e-mail já cadastrado', async () => {
        const usuario = await criarUsuario();
        await criarUsuario(false, 'outro@teste.com');
        await criarOrganizador();

        const token = await fazerLogin('organizador@teste.com');

        const res = await request(app)
            .put(`/api/usuarios/${usuario.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                email: 'outro@teste.com',
            });

        expect(res.status).toBe(409);
    });
    it('deve excluir a própria conta', async () => {
        const usuario = await criarUsuario();
        const token = await fazerLogin('usuario@teste.com');

        const res = await request(app)
            .delete(`/api/usuarios/${usuario.id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
    });

    it('não deve permitir excluir outro usuário como participante', async () => {
        await criarUsuario();
        const outro = await criarUsuario(false, 'outro@teste.com');

        const token = await fazerLogin('usuario@teste.com');

        const res = await request(app)
            .delete(`/api/usuarios/${outro.id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(403);
    });

    it('deve retornar 404 ao excluir usuário inexistente', async () => {
        await criarUsuario();
        const token = await fazerLogin('usuario@teste.com');

        const res = await request(app)
            .delete('/api/usuarios/99999')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
    });

    it('deve retornar 409 ao excluir usuário com eventos vinculados', async () => {
        const organizador = await criarOrganizador();
        const categoria = await criarCategoria();
        const local = await criarLocal();

        await criarEvento(categoria, local, organizador);

        const token = await fazerLogin('organizador@teste.com');

        const res = await request(app)
            .delete(`/api/usuarios/${organizador.id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(409);
    });
});
