import { prisma } from '../lib/services/prismaClient.js';
import { z } from 'zod';

const inscricaoSchema = z.object({
  eventoId: z.number().int(),
});



export const criar = async (req, res) => {
  try {
    const { eventoId } = inscricaoSchema.parse(req.body);
    const usuarioId = req.usuario.id;

    const resultado = await prisma.$transaction(async (tx) => {
      const evento = await tx.evento.findUnique({
        where: { id: eventoId },
      });

      if (!evento) {
        return {
          status: 404,
          body: { error: 'Evento não encontrado' },
        };
      }

      if (evento.status !== 'ATIVO') {
        return {
          status: 400,
          body: { error: 'Evento não está ativo' },
        };
      }

      if (new Date(evento.dataHora) <= new Date()) {
        return {
          status: 400,
          body: { error: 'Evento já ocorreu' },
        };
      }

      const existente = await tx.inscricao.findUnique({
        where: {
          eventoId_usuarioId: { eventoId, usuarioId },
        },
      });

      if (existente) {
        return {
          status: 409,
          body: { error: 'Você já possui uma inscrição neste evento' },
        };
      }

      const existenteLista = await tx.listaEspera.findUnique({
        where: {
          eventoId_usuarioId: { eventoId, usuarioId },
        },
      });

      if (existenteLista) {
        return {
          status: 409,
          body: { error: 'Você já está na lista de espera deste evento' },
        };
      }

      const vagaReservada = await tx.evento.updateMany({
        where: {
          id: eventoId,
          status: 'ATIVO',
          dataHora: { gt: new Date() },
          vagasDisponiveis: { gt: 0 },
        },
        data: {
          vagasDisponiveis: { decrement: 1 },
        },
      });

      if (vagaReservada.count === 1) {
        const inscricao = await tx.inscricao.create({
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

        return {
          status: 201,
          body: {
            message: 'Inscrição confirmada',
            data: inscricao,
          },
        };
      }

      const ultimaPosicao = await tx.listaEspera.aggregate({
        where: { eventoId },
        _max: { posicao: true },
      });

      const posicao = (ultimaPosicao._max.posicao ?? 0) + 1;

      await tx.listaEspera.create({
        data: {
          eventoId,
          usuarioId,
          posicao,
        },
      });

      return {
        status: 202,
        body: {
          message: 'Evento lotado. Você foi adicionado à lista de espera',
        },
      };
    });

    return res.status(resultado.status).json(resultado.body);

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
  if (evento.organizadorId !== req.usuario.id && req.usuario.papel !== 'ORGANIZADOR') {
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
        req.usuario.papel !== 'ORGANIZADOR'
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

        await tx.listaEspera.updateMany({
          where: {
            eventoId: inscricao.eventoId,
            posicao: {
              gt: proximo.posicao,
            },
          },
          data: {
            posicao: {
              decrement: 1,
            },
          },
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
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: 'ID de inscrição inválido',
      });
    }

    const inscricao = await prisma.inscricao.findUnique({
      where: { id },
      include: { evento: true },
    });

    if (!inscricao) {
      return res.status(404).json({
        error: 'Inscrição não encontrada',
      });
    }

    if (
      inscricao.evento.organizadorId !== req.usuario.id &&
      req.usuario.papel !== 'ORGANIZADOR'
    ) {
      return res.status(403).json({
        error: 'Apenas o organizador pode fazer check-in',
      });
    }

    if (inscricao.status !== 'CONFIRMADO') {
      return res.status(400).json({
        error: 'Esta inscrição não está confirmada ou já possui check-in',
      });
    }

    const resultado = await prisma.inscricao.updateMany({
      where: {
        id,
        status: 'CONFIRMADO',
      },
      data: {
        status: 'PRESENTE',
        checkinEm: new Date(),
      },
    });

    if (resultado.count === 0) {
      return res.status(409).json({
        error: 'O check-in já foi realizado ou a inscrição foi alterada',
      });
    }

    const atualizada = await prisma.inscricao.findUnique({
      where: { id },
      include: {
        usuario: {
          select: { id: true, nome: true },
        },
      },
    });

    return res.json({
      message: 'Check-in realizado com sucesso',
      data: atualizada,
    });
  } catch (error) {
    console.error('Erro ao fazer check-in:', error);

    return res.status(500).json({
      error: 'Erro ao fazer check-in',
    });
  }
};
