
import request from 'supertest';
import app from '../src/app.js';

import {
  limparBanco,
  criarUsuario,
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

  return res.body.token;
}

describe('Locais', () => {
  it('deve criar local como organizador', async () => {
    await criarUsuario(true);

    const token = await fazerLogin('organizador@teste.com');

    const res = await request(app)
      .post('/api/locais')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Ginásio Municipal',
        endereco: 'Rua das Flores, 100',
        cidade: 'Valinhos',
        cep: '13270000',
        capacidade: 100,
        tipo: 'Ginásio',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.nome).toBe('Ginásio Municipal');
  });

  it('não deve permitir criar local como participante', async () => {
    await criarUsuario();

    const token = await fazerLogin('usuario@teste.com');

    const res = await request(app)
      .post('/api/locais')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Ginásio Municipal',
        endereco: 'Rua das Flores, 100',
        cidade: 'Valinhos',
        cep: '13270000',
      });

    expect(res.status).toBe(403);
  });

  it('não deve criar local com dados inválidos', async () => {
    await criarUsuario(true);

    const token = await fazerLogin('organizador@teste.com');

    const res = await request(app)
      .post('/api/locais')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'AB',
        endereco: 'Rua',
        cidade: 'Valinhos',
        cep: '123',
      });

    expect(res.status).toBe(400);
  });

  it('deve listar locais', async () => {
    await criarLocal();

    const res = await request(app)
      .get('/api/locais');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('deve buscar local por ID', async () => {
    const local = await criarLocal();

    const res = await request(app)
      .get(`/api/locais/${local.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(local.id);
  });

  it('deve retornar 400 para ID inválido', async () => {
    const res = await request(app)
      .get('/api/locais/abc');

    expect(res.status).toBe(400);
  });

  it('deve retornar 404 para local inexistente', async () => {
    const res = await request(app)
      .get('/api/locais/99999');

    expect(res.status).toBe(404);
  });

  it('deve atualizar local', async () => {
    const local = await criarLocal();

    await criarUsuario(true);

    const token = await fazerLogin('organizador@teste.com');

    const res = await request(app)
      .put(`/api/locais/${local.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Quadra Atualizada',
        endereco: 'Rua Nova, 200',
        cidade: 'Valinhos',
        cep: '13270000',
        capacidade: 30,
        tipo: 'Quadra',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.nome).toBe('Quadra Atualizada');
  });

  it('deve retornar 404 ao atualizar local inexistente', async () => {
    await criarUsuario(true);

    const token = await fazerLogin('organizador@teste.com');

    const res = await request(app)
      .put('/api/locais/99999')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Quadra Atualizada',
        endereco: 'Rua Nova, 200',
        cidade: 'Valinhos',
        cep: '13270000',
      });

    expect(res.status).toBe(404);
  });

  it('deve retornar 409 ao excluir local vinculado a evento', async () => {
    const categoria = await criarCategoria();
    const local = await criarLocal();
    const organizador = await criarUsuario(true);

    await criarEvento(categoria, local, organizador);

    const token = await fazerLogin('organizador@teste.com');

    const res = await request(app)
      .delete(`/api/locais/${local.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
  });

  it('deve retornar 404 ao excluir local inexistente', async () => {
    await criarUsuario(true);

    const token = await fazerLogin('organizador@teste.com');

    const res = await request(app)
      .delete('/api/locais/99999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('deve excluir local sem eventos vinculados', async () => {
    const local = await criarLocal();

    await criarUsuario(true);

    const token = await fazerLogin('organizador@teste.com');

    const res = await request(app)
      .delete(`/api/locais/${local.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });
});
