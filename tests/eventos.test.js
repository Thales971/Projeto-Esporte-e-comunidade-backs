import request from "supertest";
import app from "../src/app.js";
import {
  limparBanco,
  criarUsuario,
  criarOrganizador,
  criarCategoria,
  criarLocal,
  criarEvento,
} from "./setup.js";

beforeEach(async () => {
  await limparBanco();
});

async function fazerLogin(email) {
  const login = await request(app)
    .post('/api/auth/login')
    .send({
      email,
      senha: 'senha123',
    });

  expect(login.status).toBe(200);

  return login.body.token;
}

describe("Eventos", () => {
  it("deve listar eventos com paginação", async () => {
    const cat = await criarCategoria();
    const loc = await criarLocal();
    const org = await criarUsuario(true);
    await criarEvento(cat, loc, org);
    const res = await request(app).get("/api/eventos");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.total).toBe(1);
    expect(res.body.page).toBe(1);
    expect(res.body.totalPages).toBe(1);
  });

  it("deve criar evento como organizador", async () => {
    const cat = await criarCategoria();
    const loc = await criarLocal();
    await criarOrganizador();
    const login = await request(app).post("/api/auth/login").send({
      email: "organizador@teste.com",
      senha: "senha123",
    });
    const futuro = new Date();
    futuro.setDate(futuro.getDate() + 7);
    const res = await request(app)
      .post("/api/eventos")
      .set("Authorization", `Bearer ${login.body.token}`)
      .send({
        titulo: "Novo Evento",
        descricao: "Desc",
        dataHora: futuro.toISOString(),
        duracaoMin: 60,
        vagasTotal: 10,
        preco: 0,
        categoriaId: cat.id,
        localId: loc.id,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.vagasDisponiveis).toBe(10);
  });

  it("não deve criar evento com data passada", async () => {
    const cat = await criarCategoria();
    const loc = await criarLocal();
    const org = await criarUsuario(true);
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "organizador@teste.com", senha: "senha123" });
    const passado = new Date();
    passado.setDate(passado.getDate() - 1);
    const res = await request(app)
      .post("/api/eventos")
      .set("Authorization", `Bearer ${login.body.token}`)
      .send({
        titulo: "Evento Passado",
        descricao: "Desc",
        dataHora: passado.toISOString(),
        duracaoMin: 60,
        vagasTotal: 10,
        preco: 0,
        categoriaId: cat.id,
        localId: loc.id,
      });
    expect(res.status).toBe(400);
  });

  it("não deve permitir que não-organizador crie evento", async () => {
    const cat = await criarCategoria();
    const loc = await criarLocal();
    const user = await criarUsuario();
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "usuario@teste.com", senha: "senha123" });
    const futuro = new Date();
    futuro.setDate(futuro.getDate() + 7);
    const res = await request(app)
      .post("/api/eventos")
      .set("Authorization", `Bearer ${login.body.token}`)
      .send({
        titulo: "Evento",
        descricao: "Desc",
        dataHora: futuro.toISOString(),
        duracaoMin: 60,
        vagasTotal: 10,
        preco: 0,
        categoriaId: cat.id,
        localId: loc.id,
      });
    expect(res.status).toBe(403);
  });

  it("deve retornar 404 para evento inexistente", async () => {
    const res = await request(app).get("/api/eventos/99999");
    expect(res.status).toBe(404);
  });

  it("deve filtrar eventos por categoria", async () => {
    const cat = await criarCategoria();
    const loc = await criarLocal();
    const org = await criarUsuario(true);
    await criarEvento(cat, loc, org);
    const res = await request(app).get(`/api/eventos?categoria=${cat.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data[0].categoriaId).toBe(cat.id);
  });

it("deve manter as vagas ocupadas ao atualizar o total de vagas", async () => {
  const cat = await criarCategoria();
  const loc = await criarLocal();
  const org = await criarOrganizador();
  const evento = await criarEvento(cat, loc, org);

  await criarUsuario();

  const loginOrg = await request(app)
    .post("/api/auth/login")
    .send({
      email: "organizador@teste.com",
      senha: "senha123",
    });

  const loginParticipante = await request(app)
    .post("/api/auth/login")
    .send({
      email: "usuario@teste.com",
      senha: "senha123",
    });

  const inscricao = await request(app)
    .post("/api/inscricoes")
    .set("Authorization", `Bearer ${loginParticipante.body.token}`)
    .send({ eventoId: evento.id });

  expect(inscricao.status).toBe(201);

  const dadosEvento = {
    titulo: evento.titulo,
    descricao: evento.descricao,
    dataHora: evento.dataHora.toISOString(),
    duracaoMin: evento.duracaoMin,
    vagasTotal: 15,
    preco: 0,
    categoriaId: evento.categoriaId,
    localId: evento.localId,
  };

  const atualizacao = await request(app)
    .put(`/api/eventos/${evento.id}`)
    .set("Authorization", `Bearer ${loginOrg.body.token}`)
    .send(dadosEvento);

  expect(atualizacao.status).toBe(200);
  expect(atualizacao.body.data.vagasDisponiveis).toBe(14);

  const tentativaReducao = await request(app)
    .put(`/api/eventos/${evento.id}`)
    .set("Authorization", `Bearer ${loginOrg.body.token}`)
    .send({
      ...dadosEvento,
      vagasTotal: 1,
    });

  expect(tentativaReducao.status).toBe(400);
});


it('deve retornar 400 para ID de evento inválido', async () => {
  const res = await request(app).get('/api/eventos/abc');

  expect(res.status).toBe(400);
});

it('deve retornar 400 para paginação inválida', async () => {
  const res = await request(app).get('/api/eventos?page=0');

  expect(res.status).toBe(400);
});

it('deve retornar 404 ao criar evento com categoria inexistente', async () => {
  const local = await criarLocal();
  await criarUsuario(true);

  const token = await fazerLogin('organizador@teste.com');

  const futuro = new Date();
  futuro.setDate(futuro.getDate() + 7);

  const res = await request(app)
    .post('/api/eventos')
    .set('Authorization', `Bearer ${token}`)
    .send({
      titulo: 'Evento Teste',
      descricao: 'Descrição do evento',
      dataHora: futuro.toISOString(),
      duracaoMin: 60,
      vagasTotal: 10,
      preco: 0,
      categoriaId: 99999,
      localId: local.id,
    });

  expect(res.status).toBe(404);
});

it('deve retornar 404 ao criar evento com local inexistente', async () => {
  const categoria = await criarCategoria();
  await criarUsuario(true);

  const token = await fazerLogin('organizador@teste.com');

  const futuro = new Date();
  futuro.setDate(futuro.getDate() + 7);

  const res = await request(app)
    .post('/api/eventos')
    .set('Authorization', `Bearer ${token}`)
    .send({
      titulo: 'Evento Teste',
      descricao: 'Descrição do evento',
      dataHora: futuro.toISOString(),
      duracaoMin: 60,
      vagasTotal: 10,
      preco: 0,
      categoriaId: categoria.id,
      localId: 99999,
    });

  expect(res.status).toBe(404);
});

it('deve retornar 404 ao atualizar evento com categoria inexistente', async () => {
  const categoria = await criarCategoria();
  const local = await criarLocal();
  const organizador = await criarUsuario(true);

  const evento = await criarEvento(categoria, local, organizador);
  const token = await fazerLogin('organizador@teste.com');

  const futuro = new Date();
  futuro.setDate(futuro.getDate() + 7);

  const res = await request(app)
    .put(`/api/eventos/${evento.id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      titulo: 'Evento Atualizado',
      descricao: 'Descrição atualizada',
      dataHora: futuro.toISOString(),
      duracaoMin: 60,
      vagasTotal: 10,
      preco: 0,
      categoriaId: 99999,
      localId: local.id,
    });

  expect(res.status).toBe(404);
});

it('não deve excluir evento com participante presente', async () => {
  const categoria = await criarCategoria();
  const local = await criarLocal();
  const organizador = await criarUsuario(true);

  const evento = await criarEvento(categoria, local, organizador);

  await criarUsuario(false, 'presente@teste.com');

  const tokenOrganizador = await fazerLogin('organizador@teste.com');
  const tokenParticipante = await fazerLogin('presente@teste.com');

  const inscricao = await request(app)
    .post('/api/inscricoes')
    .set('Authorization', `Bearer ${tokenParticipante}`)
    .send({
      eventoId: evento.id,
    });

  expect(inscricao.status).toBe(201);

  const checkin = await request(app)
    .patch(`/api/inscricoes/${inscricao.body.data.id}/checkin`)
    .set('Authorization', `Bearer ${tokenOrganizador}`);

  expect(checkin.status).toBe(200);
  expect(checkin.body.data.status).toBe('PRESENTE');

  const exclusao = await request(app)
    .delete(`/api/eventos/${evento.id}`)
    .set('Authorization', `Bearer ${tokenOrganizador}`);

  expect(exclusao.status).toBe(409);
});


});
