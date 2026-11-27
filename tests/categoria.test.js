
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

async function fazerLogin(email, senha = 'senha123') {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, senha });

  return res.body.token;
}

describe('Categorias', () => {
  it('deve criar categoria como organizador', async () => {
    await criarUsuario(true);

    const token = await fazerLogin('organizador@teste.com');

    const res = await request(app)
      .post('/api/categorias')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Basquete',
        descricao: 'Eventos de basquete',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.nome).toBe('Basquete');
  });

  it('não deve permitir criar categoria como participante', async () => {
    await criarUsuario();

    const token = await fazerLogin('usuario@teste.com');

    const res = await request(app)
      .post('/api/categorias')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Basquete',
      });

    expect(res.status).toBe(403);
  });

  it('não deve criar categoria com dados inválidos', async () => {
    await criarUsuario(true);

    const token = await fazerLogin('organizador@teste.com');

    const res = await request(app)
      .post('/api/categorias')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'AB',
      });

    expect(res.status).toBe(400);
  });

  it('deve listar categorias', async () => {
    await criarCategoria();

    const res = await request(app)
      .get('/api/categorias');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('deve buscar categoria por ID', async () => {
    const categoria = await criarCategoria();

    const res = await request(app)
      .get(`/api/categorias/${categoria.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(categoria.id);
  });

  it('deve retornar 400 para ID inválido', async () => {
    const res = await request(app)
      .get('/api/categorias/abc');

    expect(res.status).toBe(400);
  });

  it('deve retornar 404 para categoria inexistente', async () => {
    const res = await request(app)
      .get('/api/categorias/99999');

    expect(res.status).toBe(404);
  });

  it('deve atualizar categoria', async () => {
    const categoria = await criarCategoria();

    await criarUsuario(true);

    const token = await fazerLogin('organizador@teste.com');

    const res = await request(app)
      .put(`/api/categorias/${categoria.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Vôlei',
        descricao: 'Eventos de vôlei',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.nome).toBe('Vôlei');
  });

  it('deve retornar 404 ao atualizar categoria inexistente', async () => {
    await criarUsuario(true);

    const token = await fazerLogin('organizador@teste.com');

    const res = await request(app)
      .put('/api/categorias/99999')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Vôlei',
      });

    expect(res.status).toBe(404);
  });

  it('deve retornar 409 ao excluir categoria vinculada a evento', async () => {
    const categoria = await criarCategoria();
    const local = await criarLocal();
    const organizador = await criarUsuario(true);

    await criarEvento(categoria, local, organizador);

    const token = await fazerLogin('organizador@teste.com');

    const res = await request(app)
      .delete(`/api/categorias/${categoria.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
  });

  it('deve retornar 404 ao excluir categoria inexistente', async () => {
    await criarUsuario(true);

    const token = await fazerLogin('organizador@teste.com');

    const res = await request(app)
      .delete('/api/categorias/99999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
