import request from 'supertest';
import app from '../src/app.js';
import { limparBanco, criarUsuario, criarCategoria, criarLocal, criarEvento } from './setup.js';

beforeEach(async () => { await limparBanco(); });

async function fazerLogin(app, email = 'usuario@teste.com') {
  const res = await request(app).post('/api/auth/login').send({ email, senha: 'senha123' });
  return res.body.token;
}

describe('Avaliações', () => {
  it('não deve permitir avaliar evento sem check-in', async () => {
    const cat = await criarCategoria();
    const loc = await criarLocal();
    const org = await criarUsuario(true);
    const evento = await criarEvento(cat, loc, org);
    const user = await criarUsuario();
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
});