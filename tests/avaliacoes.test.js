import request from 'supertest';
import app from '../src/app.js';
import { limparBanco, criarUsuario, criarCategoria, criarLocal, criarEvento } from './setup.js';
import { prisma } from '../src/lib/services/prismaClient.js';

beforeEach(async () => { await limparBanco(); });

async function fazerLogin(app, email = 'usuario@teste.com') {
  const res = await request(app).post('/api/auth/login').send({ email, senha: 'senha123' });
  return res.body.token;
}

async function prepararAvaliacao() {
  const categoria = await criarCategoria();
  const local = await criarLocal();
  const organizador = await criarUsuario(true);
  const evento = await criarEvento(categoria, local, organizador);
  const usuario = await criarUsuario();
  await prisma.inscricao.create({
    data: { eventoId: evento.id, usuarioId: usuario.id, status: 'PRESENTE', checkinEm: new Date() },
  });
  return {
    evento,
    token: await fazerLogin(app),
  };
}

describe('Avaliações', () => {
  it('não deve permitir avaliar evento sem check-in', async () => {
    const cat = await criarCategoria();
    const loc = await criarLocal();
    const org = await criarUsuario(true);
    const evento = await criarEvento(cat, loc, org);
    await criarUsuario();
    const token = await fazerLogin(app, 'usuario@teste.com');
    const res = await request(app)
      .post('/api/avaliacoes')
      .set('Authorization', `Bearer ${token}`)
      .send({ eventoId: evento.id, nota: 5, comentario: 'Ótimo!' });
    expect(res.status).toBe(403);
  });

  it('deve retornar média de avaliações', async () => {
    const cat = await criarCategoria();
    const loc = await criarLocal();
    const org = await criarUsuario(true);
    const evento = await criarEvento(cat, loc, org);
    const res = await request(app).get(`/api/avaliacoes/evento/${evento.id}`);
    expect(res.status).toBe(200);
    expect(res.body.mediaAvaliacao).toBe(0);
  });

  it('deve permitir ao autor criar, consultar, atualizar e excluir sua avaliação', async () => {
    const { evento, token } = await prepararAvaliacao();
    const criada = await request(app)
      .post('/api/avaliacoes')
      .set('Authorization', `Bearer ${token}`)
      .send({ eventoId: evento.id, nota: 5, comentario: 'Ótimo!' });

    expect(criada.status).toBe(201);
    const id = criada.body.data.id;

    const consulta = await request(app).get(`/api/avaliacoes/${id}`);
    expect(consulta.status).toBe(200);
    expect(consulta.body.data.id).toBe(id);

    const atualizada = await request(app)
      .put(`/api/avaliacoes/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nota: 4, comentario: 'Muito bom!' });
    expect(atualizada.status).toBe(200);
    expect(atualizada.body.data.nota).toBe(4);
    expect(atualizada.body.data.comentario).toBe('Muito bom!');

    const lista = await request(app).get(`/api/avaliacoes/evento/${evento.id}`);
    expect(lista.body.mediaAvaliacao).toBe(4);

    const excluida = await request(app)
      .delete(`/api/avaliacoes/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(excluida.status).toBe(200);

    const removida = await request(app).get(`/api/avaliacoes/${id}`);
    expect(removida.status).toBe(404);
  });

  it('deve impedir que outro participante edite ou exclua a avaliação', async () => {
    const { evento, token } = await prepararAvaliacao();
    const criada = await request(app)
      .post('/api/avaliacoes')
      .set('Authorization', `Bearer ${token}`)
      .send({ eventoId: evento.id, nota: 5 });
    const outroUsuario = await criarUsuario(false, 'outro@teste.com');
    const tokenOutro = await fazerLogin(app, outroUsuario.email);

    const atualizada = await request(app)
      .put(`/api/avaliacoes/${criada.body.data.id}`)
      .set('Authorization', `Bearer ${tokenOutro}`)
      .send({ nota: 3 });
    const excluida = await request(app)
      .delete(`/api/avaliacoes/${criada.body.data.id}`)
      .set('Authorization', `Bearer ${tokenOutro}`);

    expect(atualizada.status).toBe(403);
    expect(excluida.status).toBe(403);
  });

  it('deve rejeitar dados inválidos e avaliações inexistentes ao atualizar', async () => {
    const { token } = await prepararAvaliacao();
    const invalida = await request(app)
      .put('/api/avaliacoes/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ nota: 6 });
    const inexistente = await request(app)
      .put('/api/avaliacoes/99999')
      .set('Authorization', `Bearer ${token}`)
      .send({ nota: 4 });

    expect(invalida.status).toBe(400);
    expect(inexistente.status).toBe(404);
  });

  it('deve rejeitar uma segunda avaliação para o mesmo evento', async () => {
    const { evento, token } = await prepararAvaliacao();
    const body = { eventoId: evento.id, nota: 5 };
    await request(app).post('/api/avaliacoes').set('Authorization', `Bearer ${token}`).send(body);

    const duplicada = await request(app)
      .post('/api/avaliacoes')
      .set('Authorization', `Bearer ${token}`)
      .send(body);
    expect(duplicada.status).toBe(409);
  });

it('não deve permitir que organizador crie avaliação', async () => {
  const categoria = await criarCategoria();
  const local = await criarLocal();
  const organizador = await criarUsuario(true);
  const evento = await criarEvento(categoria, local, organizador);

  const token = await fazerLogin(app, 'organizador@teste.com');

  const res = await request(app)
    .post('/api/avaliacoes')
    .set('Authorization', `Bearer ${token}`)
    .send({
      eventoId: evento.id,
      nota: 5,
    });

  expect(res.status).toBe(403);
});

it('deve retornar 404 ao avaliar evento inexistente', async () => {
  await criarUsuario();

  const token = await fazerLogin(app);

  const res = await request(app)
    .post('/api/avaliacoes')
    .set('Authorization', `Bearer ${token}`)
    .send({
      eventoId: 99999,
      nota: 5,
    });

  expect(res.status).toBe(404);
});

it('deve retornar 400 para nota inválida', async () => {
  const { evento, token } = await prepararAvaliacao();

  const res = await request(app)
    .post('/api/avaliacoes')
    .set('Authorization', `Bearer ${token}`)
    .send({
      eventoId: evento.id,
      nota: 6,
    });

  expect(res.status).toBe(400);
});

it('deve retornar 400 para ID inválido na listagem de avaliações', async () => {
  const res = await request(app)
    .get('/api/avaliacoes/evento/abc');

  expect(res.status).toBe(400);
});

it('deve retornar 404 ao listar avaliações de evento inexistente', async () => {
  const res = await request(app)
    .get('/api/avaliacoes/evento/99999');

  expect(res.status).toBe(404);
});

it('deve permitir que organizador atualize avaliação de participante', async () => {
  const { evento, token } = await prepararAvaliacao();

  const criada = await request(app)
    .post('/api/avaliacoes')
    .set('Authorization', `Bearer ${token}`)
    .send({
      eventoId: evento.id,
      nota: 5,
    });

  expect(criada.status).toBe(201);

  const tokenOrganizador = await fazerLogin(
    app,
    'organizador@teste.com'
  );

  const res = await request(app)
    .put(`/api/avaliacoes/${criada.body.data.id}`)
    .set('Authorization', `Bearer ${tokenOrganizador}`)
    .send({
      nota: 4,
      comentario: 'Avaliação revisada',
    });

  expect(res.status).toBe(200);
  expect(res.body.data.nota).toBe(4);
});

it('deve permitir que organizador exclua avaliação de participante', async () => {
  const { evento, token } = await prepararAvaliacao();

  const criada = await request(app)
    .post('/api/avaliacoes')
    .set('Authorization', `Bearer ${token}`)
    .send({
      eventoId: evento.id,
      nota: 5,
    });

  expect(criada.status).toBe(201);

  const tokenOrganizador = await fazerLogin(
    app,
    'organizador@teste.com'
  );

  const res = await request(app)
    .delete(`/api/avaliacoes/${criada.body.data.id}`)
    .set('Authorization', `Bearer ${tokenOrganizador}`);

  expect(res.status).toBe(200);
});

it('deve retornar 400 para ID inválido ao excluir avaliação', async () => {
  const { token } = await prepararAvaliacao();

  const res = await request(app)
    .delete('/api/avaliacoes/abc')
    .set('Authorization', `Bearer ${token}`);

  expect(res.status).toBe(400);
});

});