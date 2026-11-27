import request from 'supertest';
import app from '../src/app.js';
import { limparBanco, criarUsuario, criarOrganizador, criarCategoria, criarLocal, criarEvento } from './setup.js';

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


it('deve promover a próxima pessoa da lista de espera quando uma inscrição for cancelada', async () => {
  const cat = await criarCategoria();
  const loc = await criarLocal();
  const org = await criarUsuario(true);

  const evento = await prismaEvento(cat, loc, org, 1);

  await criarUsuario();
  await criarUsuario(false, 'segundo@teste.com');

  const token1 = await fazerLogin(app, 'usuario@teste.com');
  const token2 = await fazerLogin(app, 'segundo@teste.com');

  const primeiraInscricao = await request(app)
    .post('/api/inscricoes')
    .set('Authorization', `Bearer ${token1}`)
    .send({ eventoId: evento.id });

  expect(primeiraInscricao.status).toBe(201);

  const espera = await request(app)
    .post('/api/inscricoes')
    .set('Authorization', `Bearer ${token2}`)
    .send({ eventoId: evento.id });

  expect(espera.status).toBe(202);

  const cancelamento = await request(app)
    .patch(`/api/inscricoes/${primeiraInscricao.body.data.id}/cancelar`)
    .set('Authorization', `Bearer ${token1}`);

  expect(cancelamento.status).toBe(200);

  const minhasInscricoes = await request(app)
    .get('/api/inscricoes/minhas')
    .set('Authorization', `Bearer ${token2}`);

  expect(minhasInscricoes.status).toBe(200);
  expect(minhasInscricoes.body.data).toHaveLength(1);
  expect(minhasInscricoes.body.data[0].status).toBe('CONFIRMADO');
});


it('deve realizar check-in e impedir sua repetição', async () => {
  const cat = await criarCategoria();
  const loc = await criarLocal();
  const org = await criarOrganizador();
  const evento = await criarEvento(cat, loc, org);

  await criarUsuario();

  const tokenParticipante = await fazerLogin(app, 'usuario@teste.com');
  const tokenOrganizador = await fazerLogin(app, 'organizador@teste.com');

  const inscricao = await request(app)
    .post('/api/inscricoes')
    .set('Authorization', `Bearer ${tokenParticipante}`)
    .send({ eventoId: evento.id });

  expect(inscricao.status).toBe(201);

  const checkin = await request(app)
    .patch(`/api/inscricoes/${inscricao.body.data.id}/checkin`)
    .set('Authorization', `Bearer ${tokenOrganizador}`);

  expect(checkin.status).toBe(200);
  expect(checkin.body.data.status).toBe('PRESENTE');

  const checkinRepetido = await request(app)
    .patch(`/api/inscricoes/${inscricao.body.data.id}/checkin`)
    .set('Authorization', `Bearer ${tokenOrganizador}`);

  expect(checkinRepetido.status).toBe(400);
});


});

async function prismaEvento(cat, loc, org, vagas) {
  const { prisma } = await import('../src/lib/services/prismaClient.js');
  const futuro = new Date(); futuro.setDate(futuro.getDate() + 7);
  return prisma.evento.create({
    data: { titulo: 'Evento Lotado', descricao: 'Desc', dataHora: futuro, duracaoMin: 60, vagasTotal: vagas, vagasDisponiveis: vagas, preco: 0, categoriaId: cat.id, localId: loc.id, organizadorId: org.id },
  });
}