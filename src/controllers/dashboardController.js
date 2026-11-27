
import { prisma } from '../lib/services/prismaClient.js';

export const estatisticas = async (req, res) => {
  try {
    const isAdmin = req.usuario.papel === 'ADMIN';

    const filtroEvento = isAdmin
      ? {}
      : { organizadorId: req.usuario.id };

    const [
      totalEventos,
      totalInscricoes,
      totalUsuarios,
      totalCategorias,
      eventosPorCategoria,
    ] = await Promise.all([
      prisma.evento.count({
        where: filtroEvento,
      }),

      prisma.inscricao.count({
        where: {
          evento: filtroEvento,
        },
      }),

      isAdmin
        ? prisma.usuario.count()
        : prisma.usuario.count({
            where: {
              inscricoes: {
                some: {
                  evento: filtroEvento,
                },
              },
            },
          }),

      prisma.categoria.count({
        where: {
          eventos: {
            some: filtroEvento,
          },
        },
      }),

      prisma.evento.groupBy({
        by: ['categoriaId'],
        where: filtroEvento,
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
    const where = req.usuario.papel === 'ADMIN'
      ? {}
      : { organizadorId: req.usuario.id };

    const eventos = await prisma.evento.findMany({
      where,
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

    return res.json({ data: eventos });
  } catch (error) {
    console.error('Erro nos eventos populares:', error);

    return res.status(500).json({
      error: 'Erro ao buscar eventos populares',
    });
  }
};
