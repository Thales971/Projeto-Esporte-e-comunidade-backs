import { prisma } from '../src/lib/services/prismaClient.js';

export async function limparBanco() {
  await prisma.avaliacao.deleteMany();
  await prisma.inscricao.deleteMany();
  await prisma.listaEspera.deleteMany();
  await prisma.evento.deleteMany();
  await prisma.categoria.deleteMany();
  await prisma.local.deleteMany();
  await prisma.usuario.deleteMany();
}

export async function criarUsuario(admin = false, email = admin ? 'admin@teste.com' : 'usuario@teste.com') {
  const bcrypt = await import('bcryptjs');
  const hash = await bcrypt.default.hash('senha123', 10);
  return prisma.usuario.create({
    data: {
      nome: admin ? 'Admin Teste' : 'Usuário Teste',
      email,
      senha: hash,
      papel: admin ? 'ADMIN' : 'PARTICIPANTE',
    },
  });
}

export async function criarCategoria() {
  return prisma.categoria.create({
    data: { nome: 'Futebol', descricao: 'Teste', cor: '#10B981', icone: 'futebol' },
  });
}

export async function criarLocal() {
  return prisma.local.create({
    data: { nome: 'Quadra Teste', endereco: 'Rua Teste, 123', cidade: 'Valinhos', cep: '13270-000', capacidade: 20, tipo: 'Quadra', ativo: true },
  });
}

export async function criarEvento(categoria, local, organizador) {
  const futuro = new Date();
  futuro.setDate(futuro.getDate() + 7);
  return prisma.evento.create({
    data: {
      titulo: 'Evento Teste',
      descricao: 'Descricao teste',
      dataHora: futuro,
      duracaoMin: 60,
      vagasTotal: 10,
      vagasDisponiveis: 10,
      preco: 0,
      categoriaId: categoria.id,
      localId: local.id,
      organizadorId: organizador.id,
    },
  });
}