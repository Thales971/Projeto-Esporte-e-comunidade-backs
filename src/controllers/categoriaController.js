import { prisma } from '../lib/services/prismaClient.js';
import { z } from 'zod';

const categoriaSchema = z.object({
  nome: z.string().min(3),
  descricao: z.string().optional(),
  cor: z.string().default('#3B82F6'),
  icone: z.string().default('sport'),
  ativo: z.boolean().default(true),
});

export const listar = async (req, res) => {
  const { ativo, page = 1, limit = 10 } = req.query;
  const where = ativo !== undefined ? { ativo: ativo === 'true' } : {};
  const [categorias, total] = await Promise.all([
    prisma.categoria.findMany({ where, skip: (Number(page) - 1) * Number(limit), take: Number(limit) }),
    prisma.categoria.count({ where }),
  ]);
  return res.json({ data: categorias, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) });
};

export const buscarPorId = async (req, res) => {
  const categoria = await prisma.categoria.findUnique({ where: { id: Number(req.params.id) } });
  if (!categoria) return res.status(404).json({ error: 'Categoria não encontrada' });
  return res.json({ data: categoria });
};

export const criar = async (req, res) => {
  try {
    const data = categoriaSchema.parse(req.body);
    const categoria = await prisma.categoria.create({ data });
    return res.status(201).json({ message: 'Categoria criada', data: categoria });
  } catch (error) {
    return res.status(400).json({ error: 'Dados inválidos', detalhes: error.errors });
  }
};

export const atualizar = async (req, res) => {
  try {
    const data = categoriaSchema.parse(req.body);
    const categoria = await prisma.categoria.update({ where: { id: Number(req.params.id) }, data });
    return res.json({ message: 'Categoria atualizada', data: categoria });
  } catch (error) {
    return res.status(400).json({ error: 'Dados inválidos', detalhes: error.errors });
  }
};

export const deletar = async (req, res) => {
  try {
    await prisma.categoria.delete({ where: { id: Number(req.params.id) } });
    return res.json({ message: 'Categoria excluída' });
  } catch (error) {
    return res.status(409).json({ error: 'Não é possível excluir categoria com eventos vinculados' });
  }
};