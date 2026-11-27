import { prisma } from '../src/lib/services/prismaClient.js';
import bcrypt from 'bcryptjs';

async function main() {
  const salt = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;

  // Categorias
  const categoriaFutebol = await prisma.categoria.create({
    data: { nome: 'Futebol', descricao: 'Partidas de futebol society e campo', cor: '#10B981', icone: 'futebol' },
  });
  const categoriaVolei = await prisma.categoria.create({
    data: { nome: 'Vôlei', descricao: 'Vôlei de quadra e de praia', cor: '#3B82F6', icone: 'voleibol' },
  });
  const categoriaCorrida = await prisma.categoria.create({
    data: { nome: 'Corrida', descricao: 'Corrida de rua e treinamentos', cor: '#F59E0B', icone: 'corrida' },
  });

  // Locais
  const localQuadraA = await prisma.local.create({
    data: { nome: 'Quadra A', endereco: 'Rua das Flores, 123', cidade: 'Valinhos', cep: '13270-000', capacidade: 20, tipo: 'Quadra', ativo: true },
  });
  const localCampoB = await prisma.local.create({
    data: { nome: 'Campo B', endereco: 'Av. Esportiva, 456', cidade: 'Valinhos', cep: '13270-000', capacidade: 30, tipo: 'Campo', ativo: true },
  });

  // Usuários
  const senhaHash = await bcrypt.hash('senha123', salt);
  const admin = await prisma.usuario.create({
    data: { nome: 'Administrador', email: 'admin@esporte.com', senha: senhaHash, papel: 'ADMIN', telefone: '11999999999' },
  });
  const organizador = await prisma.usuario.create({
    data: { nome: 'Organizador Eventos', email: 'organizador@esporte.com', senha: senhaHash, papel: 'ORGANIZADOR', telefone: '11988888888' },
  });
  const participante = await prisma.usuario.create({
    data: { nome: 'João Silva', email: 'joao@esporte.com', senha: senhaHash, papel: 'PARTICIPANTE', telefone: '11977777777' },
  });

  // Eventos
  const futuro = new Date();
  futuro.setDate(futuro.getDate() + 7);

  const evento1 = await prisma.evento.create({
    data: {
      titulo: 'Torneio de Futebol Society',
      descricao: 'Torneio amistoso de futebol society para a comunidade',
      dataHora: futuro,
      duracaoMin: 90,
      vagasTotal: 20,
      vagasDisponiveis: 20,
      preco: 0,
      categoriaId: categoriaFutebol.id,
      localId: localQuadraA.id,
      organizadorId: organizador.id,
      imagemUrl: 'https://via.placeholder.com/800x400?text=Futebol',
    },
  });

  const futuro2 = new Date();
  futuro2.setDate(futuro2.getDate() + 14);
  const evento2 = await prisma.evento.create({
    data: {
      titulo: 'Aula de Vôlei Iniciante',
      descricao: 'Aula gratuita de vôlei para iniciantes',
      dataHora: futuro2,
      duracaoMin: 60,
      vagasTotal: 15,
      vagasDisponiveis: 15,
      preco: 0,
      categoriaId: categoriaVolei.id,
      localId: localQuadraA.id,
      organizadorId: organizador.id,
      imagemUrl: 'https://via.placeholder.com/800x400?text=Volei',
    },
  });

  console.log('Seed concluído com sucesso!');
  console.log('Usuários de demonstração:');
  console.log('  Admin: admin@esporte.com / senha123');
  console.log('  Organizador: organizador@esporte.com / senha123');
  console.log('  Participante: joao@esporte.com / senha123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });