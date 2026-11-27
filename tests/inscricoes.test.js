import request from 'supertest';
import app from '../src/app.js';
import { limparBanco, criarUsuario, criarCategoria, criarLocal, criarEvento } from './setup.js';

beforeEach(async () => { await limparBanco(); });

async function fazerLogin(app, email = 'usuario@teste.com') {
  const res = await request(app).post('/api/auth/login').send({ email, senha: 'senha123' });
  return res.body.token;
}

describe('Inscrições', () => {
  it('deve inscrever usuário em evento', async () => {
    const cat = await criarCategoria();
    const loc = await criarLocal();
    const org = await criarUsuario(true);
    const evento = await criarEvento(cat, loc, org);
    const user = await criarUsuario();
    const token = await fazerLogin(app, 'usuario@teste.com');
    const res = await request(app)
      .post('/api/inscricoes')
      .set('Authorization', `Bearer ${token}`)
      .send({ eventoId: evento.id });
    expect(res.status).toBe(201);
    expect(res.body.data.eventoId).toBe(evento.id);
  });

  it('não deve inscrever duplicado no mesmo evento', async () => {
    const cat = await criarCategoria();
    const loc = await criarLocal();
    const org = await criarUsuario(true);
    const evento = await criarEvento(cat, loc, org);
    const user = await criarUsuario();
    const token = await fazerLogin(app, 'usuario@teste.com');
    await request(app).post('/api/inscricoes').set('Authorization', `Bearer ${token}`).send({ eventoId: evento.id });
    const res = await request(app)
      .post('/api/inscricoes')
      .set('Authorization', `Bearer ${token}`)
      .send({ eventoId: evento.id });
    expect(res.status).toBe(409);
  });

  it('não deve inscrever em evento lotado', async () => {
    const cat = await criarCategoria();
    const loc = await criarLocal();
    const org = await criarUsuario(true);
    const evento = await await prismaEvento(cat, loc, org, 0);
    const user = await criarUsuario();
    const token = await fazerLogin(app, 'usuario@teste.com');
    const res = await request(app)
      .post('/api/inscricoes')
      .set('Authorization', `Bearer ${token}`)
      .send({ eventoId: evento.id });
    expect(res.status).toBe(202);
  });

  it('deve listar minhas inscrições', async () => {
    const cat = await criarCategoria();
    const loc = await criarLocal();
    const org = await criarUsuario(true);
    const evento = await criarEvento(cat, loc, org);
    const user = await criarUsuario();
    const token = await fazerLogin(app, 'usuario@teste.com');
    await request(app).post('/api/inscricoes').set('Authorization', `Bearer ${token}`).send({ eventoId: evento.id });
    const res = await request(app).get('/api/inscricoes/minhas').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

async function prismaEvento(cat, loc, org, vagas) {
  const { prisma } = await import('../src/lib/services/prismaClient.js');
  const futuro = new Date(); futuro.setDate(futuro.getDate() + 7);
  return prisma.evento.create({
    data: { titulo: 'Evento Lotado', descricao: 'Desc', dataHora: futuro, duracaoMin: 60, vagasTotal: vagas, vagasDisponiveis: vagas, preco: 0, categoriaId: cat.id, localId: loc.id, organizadorId: org.id },
  });
}