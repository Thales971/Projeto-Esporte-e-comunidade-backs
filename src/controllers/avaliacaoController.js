
import { prisma } from '../lib/services/prismaClient.js';
import { z } from 'zod';

// Validação para criar uma avaliação
const avaliacaoSchema = z.object({
  eventoId: z.number().int().positive(),
  nota: z.number().int().min(1).max(5),
  comentario: z.string().optional(),
}).strict();

// Validação para atualizar uma avaliação
const atualizacaoSchema = z.object({
  nota: z.number().int().min(1).max(5),
  comentario: z.string().optional(),
}).strict();

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
      error: 'Avaliação não encontrada',
    });
  }

  if (error.code === 'P2002') {
    return res.status(409).json({
      error: 'Você já avaliou este evento',
    });
  }

  if (error.code === 'P2003' || error.code === 'P2014') {
    return res.status(409).json({
      error: 'Não foi possível realizar a operação devido a registros vinculados',
    });
  }

  console.error(`Erro ao ${operacao} avaliação:`, error);

  return res.status(500).json({
    error: `Erro interno ao ${operacao} avaliação`,
  });
};

// Criar avaliação
export const criar = async (req, res) => {
  try {
    const { eventoId, nota, comentario } =
      avaliacaoSchema.parse(req.body);

    const usuarioId = req.usuario.id;

    // Verifica se o evento existe
    const evento = await prisma.evento.findUnique({
      where: { id: eventoId },
    });

    if (!evento) {
      return res.status(404).json({
        error: 'Evento não encontrado',
      });
    }

    // Verifica se o participante esteve presente
    const inscricao = await prisma.inscricao.findFirst({
      where: {
        eventoId,
        usuarioId,
        status: 'PRESENTE',
      },
    });

    if (!inscricao) {
      return res.status(403).json({
        error: 'Apenas participantes presentes podem avaliar este evento',
      });
    }

    // Verifica se já existe uma avaliação
    const existente = await prisma.avaliacao.findUnique({
      where: {
        eventoId_usuarioId: {
          eventoId,
          usuarioId,
        },
      },
    });

    if (existente) {
      return res.status(409).json({
        error: 'Você já avaliou este evento',
      });
    }

    const avaliacao = await prisma.avaliacao.create({
      data: {
        eventoId,
        usuarioId,
        nota,
        comentario,
      },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    return res.status(201).json({
      message: 'Avaliação registrada com sucesso',
      data: avaliacao,
    });
  } catch (error) {
    return tratarErro(res, error, 'criar');
  }
};

// Listar avaliações de um evento
export const listarPorEvento = async (req, res) => {
  const eventoId = obterId(req.params.id);

  if (!eventoId) {
    return res.status(400).json({
      error: 'ID de evento inválido',
    });
  }

  try {
    const evento = await prisma.evento.findUnique({
      where: { id: eventoId },
    });

    if (!evento) {
      return res.status(404).json({
        error: 'Evento não encontrado',
      });
    }

    const avaliacoes = await prisma.avaliacao.findMany({
      where: { eventoId },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
      orderBy: {
        criadoEm: 'desc',
      },
    });

    const media = avaliacoes.length > 0
      ? (
          avaliacoes.reduce(
            (soma, avaliacao) => soma + avaliacao.nota,
            0
          ) / avaliacoes.length
        )
      : 0;

    return res.json({
      data: avaliacoes,
      mediaAvaliacao: Number(media.toFixed(2)),
      total: avaliacoes.length,
    });
  } catch (error) {
    return tratarErro(res, error, 'listar');
  }
};

// Buscar avaliação por ID
export const buscarPorId = async (req, res) => {
  const id = obterId(req.params.id);

  if (!id) {
    return res.status(400).json({
      error: 'ID de avaliação inválido',
    });
  }

  try {
    const avaliacao = await prisma.avaliacao.findUnique({
      where: { id },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
          },
        },
        evento: {
          select: {
            id: true,
            titulo: true,
          },
        },
      },
    });

    if (!avaliacao) {
      return res.status(404).json({
        error: 'Avaliação não encontrada',
      });
    }

    return res.json({
      data: avaliacao,
    });
  } catch (error) {
    return tratarErro(res, error, 'buscar');
  }
};

// Atualizar avaliação
export const atualizar = async (req, res) => {
  const id = obterId(req.params.id);

  if (!id) {
    return res.status(400).json({
      error: 'ID de avaliação inválido',
    });
  }

  try {
    const data = atualizacaoSchema.parse(req.body);

    const avaliacao = await prisma.avaliacao.findUnique({
      where: { id },
    });

    if (!avaliacao) {
      return res.status(404).json({
        error: 'Avaliação não encontrada',
      });
    }

    // Autor ou organizador podem editar
    if (
      avaliacao.usuarioId !== req.usuario.id &&
      req.usuario.papel !== 'ORGANIZADOR'
    ) {
      return res.status(403).json({
        error: 'Apenas o autor ou o organizador pode editar esta avaliação',
      });
    }

    const atualizada = await prisma.avaliacao.update({
      where: { id },
      data,
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
      message: 'Avaliação atualizada com sucesso',
      data: atualizada,
    });
  } catch (error) {
    return tratarErro(res, error, 'atualizar');
  }
};

// Excluir avaliação
export const deletar = async (req, res) => {
  const id = obterId(req.params.id);

  if (!id) {
    return res.status(400).json({
      error: 'ID de avaliação inválido',
    });
  }

  try {
    const avaliacao = await prisma.avaliacao.findUnique({
      where: { id },
    });

    if (!avaliacao) {
      return res.status(404).json({
        error: 'Avaliação não encontrada',
      });
    }

    // Autor ou organizador podem excluir
    if (
      avaliacao.usuarioId !== req.usuario.id &&
      req.usuario.papel !== 'ORGANIZADOR'
    ) {
      return res.status(403).json({
        error: 'Apenas o autor ou o organizador pode excluir esta avaliação',
      });
    }

    await prisma.avaliacao.delete({
      where: { id },
    });

    return res.json({
      message: 'Avaliação excluída com sucesso',
    });
  } catch (error) {
    return tratarErro(res, error, 'excluir');
  }
};
