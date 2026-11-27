
import request from 'supertest';
import app from '../src/app.js';
import { limparBanco, criarUsuario } from './setup.js';

beforeEach(async () => {
  await limparBanco();
});

describe('Auth', () => {
  it('deve cadastrar usuário com sucesso', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        nome: 'Teste',
        email: 'teste@teste.com',
        senha: 'senha123',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.email).toBe('teste@teste.com');
    expect(res.body.data.papel).toBe('PARTICIPANTE');
  });

  it('não deve permitir cadastrar uma conta como organizador', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        nome: 'Organizador Teste',
        email: 'organizador@teste.com',
        senha: 'senha123',
        papel: 'ORGANIZADOR',
      });

    expect(res.status).toBe(400);
  });

  it('não deve cadastrar email duplicado', async () => {
    await criarUsuario();

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        nome: 'Teste 2',
        email: 'usuario@teste.com',
        senha: 'senha123',
      });

    expect(res.status).toBe(409);
  });

  it('deve fazer login e retornar token', async () => {
    await criarUsuario();

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'usuario@teste.com',
        senha: 'senha123',
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('não deve fazer login com senha errada', async () => {
    await criarUsuario();

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'usuario@teste.com',
        senha: 'senhaerrada',
      });

    expect(res.status).toBe(401);
  });
});
