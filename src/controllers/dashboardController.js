
import { prisma } from '../lib/services/prismaClient.js';

export const estatisticas = async (req, res) => {
  try {
    const [
      totalEventos,
      totalInscricoes,
      totalUsuarios,
      totalCategorias,
      eventosPorCategoria,
    ] = await Promise.all([
      prisma.evento.count(),

      prisma.inscricao.count(),

      prisma.usuario.count(),

      prisma.categoria.count({
        where: {
          eventos: {
            some: {},
          },
        },
      }),

      prisma.evento.groupBy({
        by: ['categoriaId'],
        _count: true,
      }),
    ]);

    return res.json({
      data: {
        totalEventos,
        totalInscricoes,
        totalUsuarios,
        totalCategorias,
        eventosPorCategoria,
      },
    });
  } catch (error) {
    console.error('Erro nas estatísticas:', error);

    return res.status(500).json({
      error: 'Erro ao buscar estatísticas',
    });
  }
};

export const eventosPopulares = async (req, res) => {
  try {
    const eventos = await prisma.evento.findMany({
      orderBy: {
        inscricoes: {
          _count: 'desc',
        },
      },
      take: 5,
      include: {
        categoria: true,
        _count: {
          select: {
            inscricoes: true,
          },
        },
      },
    });

    return res.json({
      data: eventos,
    });
  } catch (error) {
    console.error('Erro nos eventos populares:', error);

    return res.status(500).json({
      error: 'Erro ao buscar eventos populares',
    });
  }
};
