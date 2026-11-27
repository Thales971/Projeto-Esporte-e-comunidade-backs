import { prisma } from '../lib/services/prismaClient.js';
import { z } from 'zod';

const inscricaoSchema = z.object({
  eventoId: z.number().int(),
});


export const criar = async (req, res) => {
  try {
    const { eventoId } = inscricaoSchema.parse(req.body);
    const usuarioId = req.usuario.id;

    const evento = await prisma.evento.findUnique({
      where: { id: eventoId },
    });

    if (!evento) {
      return res.status(404).json({ error: 'Evento não encontrado' });
    }

    if (evento.status !== 'ATIVO') {
      return res.status(400).json({
        error: 'Evento não está ativo',
      });
    }

    if (new Date(evento.dataHora) <= new Date()) {
      return res.status(400).json({
        error: 'Evento já ocorreu',
      });
    }

    const existente = await prisma.inscricao.findUnique({
      where: {
        eventoId_usuarioId: {
          eventoId,
          usuarioId,
        },
      },
    });

    if (existente) {
      return res.status(409).json({
        error: 'Você já está inscrito neste evento',
      });
    }

    if (evento.vagasDisponiveis <= 0) {
      const existenteLista = await prisma.listaEspera.findUnique({
        where: {
          eventoId_usuarioId: {
            eventoId,
            usuarioId,
          },
        },
      });

      if (existenteLista) {
        return res.status(409).json({
          error: 'Você já está na lista de espera deste evento',
        });
      }

      const posicao = await prisma.listaEspera.count({
        where: { eventoId },
      });

      await prisma.listaEspera.create({
        data: {
          eventoId,
          usuarioId,
          posicao: posicao + 1,
        },
      });

      return res.status(202).json({
        message: 'Evento lotado. Você foi adicionado à lista de espera',
      });
    }

    const inscricao = await prisma.inscricao.create({
      data: {
        eventoId,
        usuarioId,
      },
      include: {
        evento: {
          select: {
            id: true,
            titulo: true,
            dataHora: true,
          },
        },
      },
    });

    await prisma.evento.update({
      where: { id: eventoId },
      data: {
        vagasDisponiveis: {
          decrement: 1,
        },
      },
    });

    return res.status(201).json({
      message: 'Inscrição confirmada',
      data: inscricao,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        detalhes: error.issues,
      });
    }

    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'Você já possui uma inscrição ou está na lista de espera',
      });
    }

    console.error('Erro ao criar inscrição:', error);

    return res.status(500).json({
      error: 'Erro ao inscrever',
    });
  }
};


export const listarMinhas = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const [inscricoes, total] = await Promise.all([
    prisma.inscricao.findMany({
      where: { usuarioId: req.usuario.id },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      include: { evento: { include: { categoria: true, local: true } } },
      orderBy: { dataInscricao: 'desc' },
    }),
    prisma.inscricao.count({ where: { usuarioId: req.usuario.id } }),
  ]);
  return res.json({ data: inscricoes, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) });
};

export const listarPorEvento = async (req, res) => {
  const { id } = req.params;
  const evento = await prisma.evento.findUnique({ where: { id: Number(id) } });
  if (!evento) return res.status(404).json({ error: 'Evento não encontrado' });
  if (evento.organizadorId !== req.usuario.id && req.usuario.papel !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  const inscricoes = await prisma.inscricao.findMany({
    where: { eventoId: Number(id) },
    include: { usuario: { select: { id: true, nome: true, email: true } } },
  });
  return res.json({ data: inscricoes });
};


export const cancelar = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const resultado = await prisma.$transaction(async (tx) => {
      const inscricao = await tx.inscricao.findUnique({
        where: { id },
      });

      if (!inscricao) {
        return {
          status: 404,
          body: { error: 'Inscrição não encontrada' },
        };
      }

      if (
        inscricao.usuarioId !== req.usuario.id &&
        req.usuario.papel !== 'ADMIN'
      ) {
        return {
          status: 403,
          body: { error: 'Acesso negado' },
        };
      }

      if (inscricao.status !== 'CONFIRMADO') {
        return {
          status: 400,
          body: { error: 'Esta inscrição não pode ser cancelada' },
        };
      }

      await tx.inscricao.update({
        where: { id },
        data: { status: 'CANCELADO' },
      });

      const proximo = await tx.listaEspera.findFirst({
        where: { eventoId: inscricao.eventoId },
        orderBy: [
          { posicao: 'asc' },
          { dataEntrada: 'asc' },
        ],
      });

      if (proximo) {
        await tx.inscricao.create({
          data: {
            eventoId: inscricao.eventoId,
            usuarioId: proximo.usuarioId,
            status: 'CONFIRMADO',
          },
        });

        await tx.listaEspera.delete({
          where: { id: proximo.id },
        });

        return {
          status: 200,
          body: {
            message: 'Inscrição cancelada. A próxima pessoa da lista de espera foi promovida.',
          },
        };
      }

      await tx.evento.update({
        where: { id: inscricao.eventoId },
        data: {
          vagasDisponiveis: {
            increment: 1,
          },
        },
      });

      return {
        status: 200,
        body: {
          message: 'Inscrição cancelada. Vaga liberada.',
        },
      };
    });

    return res.status(resultado.status).json(resultado.body);

  } catch (error) {
    console.error('Erro ao cancelar inscrição:', error);

    return res.status(500).json({
      error: 'Erro ao cancelar inscrição',
    });
  }
};


export const checkin = async (req, res) => {
  try {
    const { id } = req.params;
    const inscricao = await prisma.inscricao.findUnique({
      where: { id: Number(id) },
      include: { evento: true },
    });
    if (!inscricao) return res.status(404).json({ error: 'Inscrição não encontrada' });
    if (inscricao.evento.organizadorId !== req.usuario.id && req.usuario.papel !== 'ADMIN') {
      return res.status(403).json({ error: 'Apenas o organizador pode fazer check-in' });
    }
    const atualizada = await prisma.inscricao.update({
      where: { id: Number(id) },
      data: { status: 'PRESENTE', checkinEm: new Date() },
      include: { usuario: { select: { id: true, nome: true } } },
    });
    return res.json({ message: 'Check-in realizado', data: atualizada });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao fazer check-in' });
  }
};
