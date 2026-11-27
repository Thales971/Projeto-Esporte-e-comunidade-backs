import { prisma } from '../lib/services/prismaClient.js';
import { z } from 'zod';

const avaliacaoSchema = z.object({
  eventoId: z.number().int(),
  nota: z.number().int().min(1).max(5),
  comentario: z.string().optional(),
});

const atualizacaoSchema = z.object({
  nota: z.number().int().min(1).max(5),
  comentario: z.string().optional(),
}).strict();

const obterId = (id) => {
  const valor = Number(id);
  return Number.isSafeInteger(valor) && valor > 0 ? valor : null;
};

export const criar = async (req, res) => {
  try {
    const { eventoId, nota, comentario } = avaliacaoSchema.parse(req.body);
    const usuarioId = req.usuario.id;

    const inscricao = await prisma.inscricao.findFirst({
      where: { eventoId, usuarioId, status: 'PRESENTE' },
    });
    if (!inscricao) {
      return res.status(403).json({ error: 'Apenas participantes presentes podem avaliar este evento' });
    }

    const existente = await prisma.avaliacao.findFirst({ where: { eventoId, usuarioId } });
    if (existente) {
      return res.status(409).json({ error: 'Você já avaliou este evento' });
    }

    const avaliacao = await prisma.avaliacao.create({
      data: { eventoId, usuarioId, nota, comentario },
      include: { usuario: { select: { id: true, nome: true } } },
    });
    return res.status(201).json({ message: 'Avaliação registrada', data: avaliacao });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', detalhes: error.issues });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Você já avaliou este evento' });
    }
    return res.status(500).json({ error: 'Erro ao criar avaliação' });
  }
};

export const listarPorEvento = async (req, res) => {
  const eventoId = obterId(req.params.id);
  if (!eventoId) return res.status(404).json({ error: 'Evento não encontrado' });

  const avaliacoes = await prisma.avaliacao.findMany({
    where: { eventoId },
    include: { usuario: { select: { id: true, nome: true } } },
  });
  const media = avaliacoes.length > 0
    ? (avaliacoes.reduce((sum, a) => sum + a.nota, 0) / avaliacoes.length).toFixed(2)
    : 0;
  return res.json({ data: avaliacoes, mediaAvaliacao: Number(media), total: avaliacoes.length });
};

export const buscarPorId = async (req, res) => {
  const id = obterId(req.params.id);
  if (!id) return res.status(404).json({ error: 'Avaliação não encontrada' });

  const avaliacao = await prisma.avaliacao.findUnique({
    where: { id },
    include: {
      usuario: { select: { id: true, nome: true } },
      evento: { select: { id: true, titulo: true } },
    },
  });
  if (!avaliacao) return res.status(404).json({ error: 'Avaliação não encontrada' });
  return res.json({ data: avaliacao });
};

export const atualizar = async (req, res) => {
  const id = obterId(req.params.id);
  if (!id) return res.status(404).json({ error: 'Avaliação não encontrada' });

  try {
    const data = atualizacaoSchema.parse(req.body);
    const avaliacao = await prisma.avaliacao.findUnique({ where: { id } });
    if (!avaliacao) return res.status(404).json({ error: 'Avaliação não encontrada' });
    if (avaliacao.usuarioId !== req.usuario.id && req.usuario.papel !== 'ADMIN') {
      return res.status(403).json({ error: 'Apenas o autor ou um administrador pode editar esta avaliação' });
    }

    const atualizada = await prisma.avaliacao.update({
      where: { id },
      data,
      include: { usuario: { select: { id: true, nome: true } } },
    });
    return res.json({ message: 'Avaliação atualizada', data: atualizada });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', detalhes: error.issues });
    }
    return res.status(500).json({ error: 'Erro ao atualizar avaliação' });
  }
};

export const deletar = async (req, res) => {
  const id = obterId(req.params.id);
  if (!id) return res.status(404).json({ error: 'Avaliação não encontrada' });

  try {
    const avaliacao = await prisma.avaliacao.findUnique({ where: { id } });
    if (!avaliacao) return res.status(404).json({ error: 'Avaliação não encontrada' });
    if (avaliacao.usuarioId !== req.usuario.id && req.usuario.papel !== 'ADMIN') {
      return res.status(403).json({ error: 'Apenas o autor ou um administrador pode excluir esta avaliação' });
    }

    await prisma.avaliacao.delete({ where: { id } });
    return res.json({ message: 'Avaliação excluída' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao excluir avaliação' });
  }
};

