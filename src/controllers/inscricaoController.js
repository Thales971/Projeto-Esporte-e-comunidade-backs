
import { prisma } from '../lib/services/prismaClient.js';
import { z } from 'zod';

// Validação dos dados de inscrição
const inscricaoSchema = z.object({
  eventoId: z.number().int().positive(),
}).strict();

// Validação da paginação
const paginacaoSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// Validação de IDs
const obterId = (valor) => {
  const id = Number(valor);

  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

// Tratamento padronizado dos erros
const tratarErro = (res, error, operacao) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      error: 'Dados inválidos',
      detalhes: error.issues,
    });
  }

  if (error.code === 'P2025') {
    return res.status(404).json({
      error: 'Inscrição não encontrada',
    });
  }

  if (error.code === 'P2002') {
    return res.status(409).json({
      error: 'Já existe uma inscrição ou entrada na lista de espera',
    });
  }

  if (error.code === 'P2003' || error.code === 'P2014') {
    return res.status(409).json({
      error: 'Não foi possível realizar a operação devido a registros vinculados',
    });
  }

  console.error(`Erro ao ${operacao} inscrição:`, error);

  return res.status(500).json({
    error: `Erro interno ao ${operacao} inscrição`,
  });
};

// Criar inscrição
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

      const existente = await tx.inscricao.findUnique({
        where: {
          eventoId_usuarioId: { eventoId, usuarioId },
        },
      });

      // Inscrições confirmadas ou com presença não podem ser duplicadas
      if (existente && existente.status !== 'CANCELADO') {
        return {
          status: 409,
          body: { error: 'Você já possui uma inscrição neste evento' },
        };
      }

      // Reserva uma vaga de forma atômica
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
        let inscricao;

        if (existente) {
          // Reativa uma inscrição anteriormente cancelada
          inscricao = await tx.inscricao.update({
            where: { id: existente.id },
            data: {
              status: 'CONFIRMADO',
              dataInscricao: new Date(),
              checkinEm: null,
              observacao: null,
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
        } else {
          inscricao = await tx.inscricao.create({
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
        }

        return {
          status: 201,
          body: {
            message: 'Inscrição confirmada',
            data: inscricao,
          },
        };
      }

      // Verifica novamente o evento caso a vaga não tenha sido reservada
      const eventoAtual = await tx.evento.findUnique({
        where: { id: eventoId },
      });

      if (!eventoAtual || eventoAtual.status !== 'ATIVO') {
        return {
          status: eventoAtual ? 400 : 404,
          body: {
            error: eventoAtual
              ? 'Evento não está ativo'
              : 'Evento não encontrado',
          },
        };
      }

      if (new Date(eventoAtual.dataHora) <= new Date()) {
        return {
          status: 400,
          body: { error: 'Evento já ocorreu' },
        };
      }

      // Evento lotado: adiciona à lista de espera
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
          data: { eventoId, posicao },
        },
      };
    });

    return res.status(resultado.status).json(resultado.body);
  } catch (error) {
    return tratarErro(res, error, 'criar');
  }
};

// Listar inscrições do usuário autenticado
export const listarMinhas = async (req, res) => {
  try {
    const { page, limit } = paginacaoSchema.parse(req.query);

    const where = {
      usuarioId: req.usuario.id,
    };

    const [inscricoes, total] = await Promise.all([
      prisma.inscricao.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          evento: {
            include: {
              categoria: true,
              local: true,
            },
          },
        },
        orderBy: {
          dataInscricao: 'desc',
        },
      }),
      prisma.inscricao.count({ where }),
    ]);

    return res.json({
      data: inscricoes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return tratarErro(res, error, 'listar');
  }
};

// Listar inscrições de um evento
export const listarPorEvento = async (req, res) => {
  const id = obterId(req.params.id);

  if (!id) {
    return res.status(400).json({
      error: 'ID de evento inválido',
    });
  }

  try {
    const evento = await prisma.evento.findUnique({
      where: { id },
    });

    if (!evento) {
      return res.status(404).json({
        error: 'Evento não encontrado',
      });
    }

    if (
      evento.organizadorId !== req.usuario.id &&
      req.usuario.papel !== 'ORGANIZADOR'
    ) {
      return res.status(403).json({
        error: 'Acesso negado',
      });
    }

    const inscricoes = await prisma.inscricao.findMany({
      where: { eventoId: id },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
      orderBy: {
        dataInscricao: 'asc',
      },
    });

    return res.json({
      data: inscricoes,
    });
  } catch (error) {
    return tratarErro(res, error, 'listar');
  }
};

// Cancelar inscrição e promover a próxima pessoa da fila
export const cancelar = async (req, res) => {
  const id = obterId(req.params.id);

  if (!id) {
    return res.status(400).json({
      error: 'ID de inscrição inválido',
    });
  }

  try {
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

      // Impede dois cancelamentos simultâneos da mesma inscrição
      const cancelamento = await tx.inscricao.updateMany({
        where: {
          id,
          status: 'CONFIRMADO',
        },
        data: {
          status: 'CANCELADO',
        },
      });

      if (cancelamento.count === 0) {
        return {
          status: 409,
          body: { error: 'Esta inscrição já foi alterada ou cancelada' },
        };
      }

      // Procura a próxima pessoa da lista de espera
      let proximo = await tx.listaEspera.findFirst({
        where: {
          eventoId: inscricao.eventoId,
        },
        orderBy: [
          { posicao: 'asc' },
          { dataEntrada: 'asc' },
        ],
      });

      let promovido = false;

      while (proximo) {
        const inscricaoAnterior = await tx.inscricao.findUnique({
          where: {
            eventoId_usuarioId: {
              eventoId: inscricao.eventoId,
              usuarioId: proximo.usuarioId,
            },
          },
        });

        // Se já existir uma inscrição ativa, remove a entrada antiga da fila
        if (
          inscricaoAnterior &&
          inscricaoAnterior.status !== 'CANCELADO'
        ) {
          await tx.listaEspera.delete({
            where: { id: proximo.id },
          });

          await tx.listaEspera.updateMany({
            where: {
              eventoId: inscricao.eventoId,
              posicao: { gt: proximo.posicao },
            },
            data: {
              posicao: { decrement: 1 },
            },
          });

          proximo = await tx.listaEspera.findFirst({
            where: { eventoId: inscricao.eventoId },
            orderBy: [
              { posicao: 'asc' },
              { dataEntrada: 'asc' },
            ],
          });

          continue;
        }

        if (inscricaoAnterior) {
          // Reativa uma inscrição anteriormente cancelada
          await tx.inscricao.update({
            where: { id: inscricaoAnterior.id },
            data: {
              status: 'CONFIRMADO',
              dataInscricao: new Date(),
              checkinEm: null,
              observacao: null,
            },
          });
        } else {
          await tx.inscricao.create({
            data: {
              eventoId: inscricao.eventoId,
              usuarioId: proximo.usuarioId,
              status: 'CONFIRMADO',
            },
          });
        }

        await tx.listaEspera.delete({
          where: { id: proximo.id },
        });

        await tx.listaEspera.updateMany({
          where: {
            eventoId: inscricao.eventoId,
            posicao: { gt: proximo.posicao },
          },
          data: {
            posicao: { decrement: 1 },
          },
        });

        promovido = true;
        break;
      }

      // Se ninguém foi promovido, libera a vaga
      if (!promovido) {
        await tx.evento.update({
          where: { id: inscricao.eventoId },
          data: {
            vagasDisponiveis: { increment: 1 },
          },
        });
      }

      return {
        status: 200,
        body: {
          message: promovido
            ? 'Inscrição cancelada. A próxima pessoa da lista de espera foi promovida.'
            : 'Inscrição cancelada. Vaga liberada.',
        },
      };
    });

    return res.status(resultado.status).json(resultado.body);
  } catch (error) {
    return tratarErro(res, error, 'cancelar');
  }
};

// Realizar check-in
export const checkin = async (req, res) => {
  const id = obterId(req.params.id);

  if (!id) {
    return res.status(400).json({
      error: 'ID de inscrição inválido',
    });
  }

  try {
    const inscricao = await prisma.inscricao.findUnique({
      where: { id },
      include: {
        evento: true,
      },
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
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    return res.json({
      message: 'Check-in realizado com sucesso',
      data: atualizada,
    });
  } catch (error) {
    return tratarErro(res, error, 'realizar check-in');
  }
};
