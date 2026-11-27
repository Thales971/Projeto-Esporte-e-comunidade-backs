import { prisma } from '../lib/services/prismaClient.js';
import { zod } from 'zod';

const localSchema = zod.object({
  nome: zod.string().min(3),
  endereco: zod.string().min(3),
  cidade: zod.string().min(3),
  cep: zod.string().min(5),
  capacidade: zod.number().int().positive().optional(),
  tipo: zod.string().default('Quadra'),
  ativo: zod.boolean().default(true),
});

export const listar = async (req, res) => {
  const { ativo, tipo, page = 1, limit = 10 } = req.query;
  const where = {};
  if (ativo !== undefined) where.ativo = ativo === 'true';
  if (tipo) where.tipo = tipo;
  const [locais, total] = await Promise.all([
    prisma.local.findMany({ where, skip: (Number(page) - 1) * Number(limit), take: Number(limit) }),
    prisma.local.count({ where }),
  ]);
  return res.json({ data: locais, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) });
};

export const buscarPorId = async (req, res) => {
  const local = await prisma.local.findUnique({ where: { id: Number(req.params.id) } });
  if (!local) return res.status(404).json({ error: 'Local não encontrado' });
  return res.json({ data: local });
};

export const criar = async (req, res) => {
  try {
    const data = localSchema.parse(req.body);
    const local = await prisma.local.create({ data });
    return res.status(201).json({ message: 'Local criado', data: local });
  } catch (error) {
    return res.status(400).json({ error: 'Dados inválidos', detalhes: error.errors });
  }
};

export const atualizar = async (req, res) => {
  try {
    const data = localSchema.parse(req.body);
    const local = await prisma.local.update({ where: { id: Number(req.params.id) }, data });
    return res.json({ message: 'Local atualizado', data: local });
  } catch (error) {
    return res.status(400).json({ error: 'Dados inválidos', detalhes: error.errors });
  }
};

export const deletar = async (req, res) => {
  try {
    await prisma.local.delete({ where: { id: Number(req.params.id) } });
    return res.json({ message: 'Local excluído' });
  } catch (error) {
    return res.status(409).json({ error: 'Não é possível excluir local com eventos vinculados' });
  }
};
