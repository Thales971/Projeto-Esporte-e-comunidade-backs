import { prisma } from '../lib/services/prismaClient.js';

export const estatisticas = async (req, res) => {
  const [totalEventos, totalInscricoes, totalUsuarios, totalCategorias] = await Promise.all([
    prisma.evento.count(),
    prisma.inscricao.count(),
    prisma.usuario.count(),
    prisma.categoria.count(),
  ]);
  const eventosPorCategoria = await prisma.evento.groupBy({
    by: ['categoriaId'],
    _count: true,
  });
  return res.json({
    data: {
      totalEventos,
      totalInscricoes,
      totalUsuarios,
      totalCategorias,
      eventosPorCategoria,
    },
  });
};

export const eventosPopulares = async (req, res) => {
  const eventos = await prisma.evento.findMany({
    orderBy: { vagasTotal: 'desc' },
    take: 5,
    include: {
      categoria: true,
      _count: { select: { inscricoes: true } },
    },
  });
  return res.json({ data: eventos });
};