import request from 'supertest';
import app from '../src/app.js';
import { limparBanco, criarUsuario, criarCategoria, criarLocal, criarEvento } from './setup.js';

beforeEach(async () => { await limparBanco(); });

describe('Eventos', () => {
  it('deve listar eventos com paginação', async () => {
    const cat = await criarCategoria();
    const loc = await criarLocal();
    const org = await criarUsuario(true);
    await criarEvento(cat, loc, org);
    const res = await request(app).get('/api/eventos');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.total).toBe(1);
    expect(res.body.page).toBe(1);
    expect(res.body.totalPages).toBe(1);
  });

  it('deve criar evento como organizador', async () => {
    const cat = await criarCategoria();
    const loc = await criarLocal();
    const org = await criarUsuario(true);
    const login = await request(app).post('/api/auth/login').send({ email: 'admin@teste.com', senha: 'senha123' });
    const futuro = new Date(); futuro.setDate(futuro.getDate() + 7);
    const res = await request(app)
      .post('/api/eventos')
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ titulo: 'Novo Evento', descricao: 'Desc', dataHora: futuro.toISOString(), duracaoMin: 60, vagasTotal: 10, preco: 0, categoriaId: cat.id, localId: loc.id });
    expect(res.status).toBe(201);
    expect(res.body.data.vagasDisponiveis).toBe(10);
  });

  it('não deve criar evento com data passada', async () => {
    const cat = await criarCategoria();
    const loc = await criarLocal();
    const org = await criarUsuario(true);
    const login = await request(app).post('/api/auth/login').send({ email: 'admin@teste.com', senha: 'senha123' });
    const passado = new Date(); passado.setDate(passado.getDate() - 1);
    const res = await request(app)
      .post('/api/eventos')
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ titulo: 'Evento Passado', descricao: 'Desc', dataHora: passado.toISOString(), duracaoMin: 60, vagasTotal: 10, preco: 0, categoriaId: cat.id, localId: loc.id });
    expect(res.status).toBe(400);
  });

  it('não deve permitir que não-organizador crie evento', async () => {
    const cat = await criarCategoria();
    const loc = await criarLocal();
    const user = await criarUsuario();
    const login = await request(app).post('/api/auth/login').send({ email: 'usuario@teste.com', senha: 'senha123' });
    const futuro = new Date(); futuro.setDate(futuro.getDate() + 7);
    const res = await request(app)
      .post('/api/eventos')
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ titulo: 'Evento', descricao: 'Desc', dataHora: futuro.toISOString(), duracaoMin: 60, vagasTotal: 10, preco: 0, categoriaId: cat.id, localId: loc.id });
    expect(res.status).toBe(403);
  });

  it('deve retornar 404 para evento inexistente', async () => {
    const res = await request(app).get('/api/eventos/99999');
    expect(res.status).toBe(404);
  });

  it('deve filtrar eventos por categoria', async () => {
    const cat = await criarCategoria();
    const loc = await criarLocal();
    const org = await criarUsuario(true);
    await criarEvento(cat, loc, org);
    const res = await request(app).get(`/api/eventos?categoria=${cat.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data[0].categoriaId).toBe(cat.id);
  });
});