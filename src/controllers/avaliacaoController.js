import { prisma } from '../lib/services/prismaClient.js';
import { z } from 'zod';

const avaliacaoSchema = z.object({
  eventoId: z.number().int(),
  nota: z.number().int().min(1).max(5),
  comentario: z.string().optional(),
});

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
    if (error.errors) return res.status(400).json({ error: 'Dados inválidos', detalhes: error.errors });
    return res.status(500).json({ error: 'Erro ao criar avaliação' });
  }
};

export const listarPorEvento = async (req, res) => {
  const { id } = req.params;
  const avaliacoes = await prisma.avaliacao.findMany({
    where: { eventoId: Number(id) },
    include: { usuario: { select: { id: true, nome: true } } },
  });
  const media = avaliacoes.length > 0
    ? (avaliacoes.reduce((sum, a) => sum + a.nota, 0) / avaliacoes.length).toFixed(2)
    : 0;
  return res.json({ data: avaliacoes, mediaAvaliacao: Number(media), total: avaliacoes.length });
};