import { prisma } from '../lib/services/prismaClient.js';
import { z } from 'zod';

const eventoSchema = z.object({
  titulo: z.string().min(3),
  descricao: z.string().min(3),
  dataHora: z.string().datetime('Data inválida'),
  duracaoMin: z.number().int().positive().default(60),
  vagasTotal: z.number().int().positive(),
  preco: z.number().nonnegative().default(0),
  categoriaId: z.number().int(),
  localId: z.number().int(),
  imagemUrl: z.string().optional(),
});

export const listar = async (req, res) => {
  const { categoria, local, data, q, page = 1, limit = 10, status } = req.query;
  const where = {};
  if (categoria) where.categoriaId = Number(categoria);
  if (local) where.localId = Number(local);
  if (status) where.status = status;
  if (data) {
    where.dataHora = { gte: new Date(data), lt: new Date(new Date(data).getTime() + 86400000) };
  }
  if (q) {
    where.OR = [
      { titulo: { contains: q, mode: 'insensitive' } },
      { descricao: { contains: q, mode: 'insensitive' } },
    ];
  }
  const [eventos, total] = await Promise.all([
    prisma.evento.findMany({
      where,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { dataHora: 'asc' },
      include: { categoria: true, local: true, organizador: { select: { id: true, nome: true } } },
    }),
    prisma.evento.count({ where }),
  ]);
  const eventosComVagas = eventos.map((e) => ({
    ...e,
    vagasOcupadas: e.vagasTotal - e.vagasDisponiveis,
  }));
  return res.json({ data: eventosComVagas, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) });
};

export const buscarPorId = async (req, res) => {
  const evento = await prisma.evento.findUnique({
    where: { id: Number(req.params.id) },
    include: { categoria: true, local: true, organizador: { select: { id: true, nome: true, email: true } } },
  });
  if (!evento) return res.status(404).json({ error: 'Evento não encontrado' });
  return res.json({ data: { ...evento, vagasOcupadas: evento.vagasTotal - evento.vagasDisponiveis } });
};

export const criar = async (req, res) => {
  try {
    const data = eventoSchema.parse(req.body);
    const dataHora = new Date(data.dataHora);
    if (dataHora <= new Date()) {
      return res.status(400).json({ error: 'Data do evento deve ser futura' });
    }
    const evento = await prisma.evento.create({
      data: {
        ...data,
        dataHora,
        vagasDisponiveis: data.vagasTotal,
        organizadorId: req.usuario.id,
      },
      include: { categoria: true, local: true },
    });
    return res.status(201).json({ message: 'Evento criado com sucesso', data: evento });
  } catch (error) {
    if (error.errors) return res.status(400).json({ error: 'Dados inválidos', detalhes: error.errors });
    return res.status(500).json({ error: 'Erro ao criar evento' });
  }
};

export const atualizar = async (req, res) => {
  try {
    const evento = await prisma.evento.findUnique({ where: { id: Number(req.params.id) } });
    if (!evento) return res.status(404).json({ error: 'Evento não encontrado' });
    if (evento.organizadorId !== req.usuario.id && req.usuario.papel !== 'ADMIN') {
      return res.status(403).json({ error: 'Apenas o organizador pode editar este evento' });
    }
    const data = eventoSchema.parse(req.body);
    const dataHora = new Date(data.dataHora);

if (dataHora <= new Date()) {
  return res.status(400).json({
    error: 'Data do evento deve ser futura',
  });
}
    const eventoAtualizado = await prisma.evento.update({
      where: { id: Number(req.params.id) },
      data: { ...data, dataHora },
      include: { categoria: true, local: true },
    });
    return res.json({ message: 'Evento atualizado', data: eventoAtualizado });
  } catch (error) {
    if (error.errors) return res.status(400).json({ error: 'Dados inválidos', detalhes: error.errors });
    return res.status(500).json({ error: 'Erro ao atualizar evento' });
  }
};

export const deletar = async (req, res) => {
  try {
    const evento = await prisma.evento.findUnique({ where: { id: Number(req.params.id) } });
    if (!evento) return res.status(404).json({ error: 'Evento não encontrado' });
    if (evento.organizadorId !== req.usuario.id && req.usuario.papel !== 'ADMIN') {
      return res.status(403).json({ error: 'Apenas o organizador pode excluir este evento' });
    }
    const inscricoes = await prisma.inscricao.count({ where: { eventoId: Number(req.params.id), status: 'CONFIRMADO' } });
    if (inscricoes > 0) {
      return res.status(409).json({ error: 'Não é possível excluir evento com inscrições confirmadas' });
    }
    await prisma.evento.delete({ where: { id: Number(req.params.id) } });
    return res.json({ message: 'Evento excluído' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao excluir evento' });
  }
};

export const meusEventos = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const where = req.usuario.papel === 'ADMIN'
    ? {}
    : { organizadorId: req.usuario.id };

  const [eventos, total] = await Promise.all([
    prisma.evento.findMany({
      where,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { dataHora: 'desc' },
    }),
    prisma.evento.count({ where }),
  ]);

  return res.json({
    data: eventos,
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / Number(limit)),
  });
};