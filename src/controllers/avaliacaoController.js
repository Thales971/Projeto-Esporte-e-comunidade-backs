
import { prisma } from '../lib/services/prismaClient.js';
import { z } from 'zod';

// Validação para criar uma avaliação
const avaliacaoSchema = z.object({
  eventoId: z.number().int(),
  nota: z.number().int().min(1).max(5),
  comentario: z.string().optional(),
});

// Validação para atualizar uma avaliação
const atualizacaoSchema = z.object({
  nota: z.number().int().min(1).max(5),
  comentario: z.string().optional(),
}).strict();

// Validação de IDs
const obterId = (id) => {
  const valor = Number(id);
  return Number.isSafeInteger(valor) && valor > 0 ? valor : null;
};

// Criar avaliação
export const criar = async (req, res) => {
  try {
    const { eventoId, nota, comentario } = avaliacaoSchema.parse(req.body);
    const usuarioId = req.usuario.id;

    // Verifica se o participante esteve presente no evento
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

    // Verifica se o usuário já avaliou o evento
    const existente = await prisma.avaliacao.findFirst({
      where: { eventoId, usuarioId },
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
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        detalhes: error.issues,
      });
    }

    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'Você já avaliou este evento',
      });
    }

    console.error('Erro ao criar avaliação:', error);

    return res.status(500).json({
      error: 'Erro ao criar avaliação',
    });
  }
};

// Listar avaliações de um evento
export const listarPorEvento = async (req, res) => {
  const eventoId = obterId(req.params.id);

  if (!eventoId) {
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
  });

  const media = avaliacoes.length > 0
    ? (
        avaliacoes.reduce((sum, avaliacao) => sum + avaliacao.nota, 0) /
        avaliacoes.length
      ).toFixed(2)
    : 0;

  return res.json({
    data: avaliacoes,
    mediaAvaliacao: Number(media),
    total: avaliacoes.length,
  });
};

// Buscar avaliação por ID
export const buscarPorId = async (req, res) => {
  const id = obterId(req.params.id);

  if (!id) {
    return res.status(404).json({
      error: 'Avaliação não encontrada',
    });
  }

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
};

// Atualizar avaliação
export const atualizar = async (req, res) => {
  const id = obterId(req.params.id);

  if (!id) {
    return res.status(404).json({
      error: 'Avaliação não encontrada',
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

    // O autor ou o organizador podem atualizar a avaliação
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
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        detalhes: error.issues,
      });
    }

    console.error('Erro ao atualizar avaliação:', error);

    return res.status(500).json({
      error: 'Erro ao atualizar avaliação',
    });
  }
};

// Excluir avaliação
export const deletar = async (req, res) => {
  const id = obterId(req.params.id);

  if (!id) {
    return res.status(404).json({
      error: 'Avaliação não encontrada',
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

    // O autor ou o organizador podem excluir a avaliação
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
    console.error('Erro ao excluir avaliação:', error);

    return res.status(500).json({
      error: 'Erro ao excluir avaliação',
    });
  }
};
  
