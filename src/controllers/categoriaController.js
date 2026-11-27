
import { prisma } from '../lib/services/prismaClient.js';
import { z } from 'zod';

const categoriaSchema = z.object({
  nome: z.string().min(3),
  descricao: z.string().optional(),
  cor: z.string().default('#3B82F6'),
  icone: z.string().default('sport'),
  ativo: z.boolean().default(true),
});

// Valida o ID recebido pela rota
const obterId = (valor) => {
  const id = Number(valor);

  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

// Padroniza o tratamento dos erros
const tratarErro = (res, error, operacao) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      error: 'Dados inválidos',
      detalhes: error.issues,
    });
  }

  if (error.code === 'P2025') {
    return res.status(404).json({
      error: 'Categoria não encontrada',
    });
  }

  if (error.code === 'P2002') {
    return res.status(409).json({
      error: 'Já existe uma categoria com esses dados',
    });
  }

  if (error.code === 'P2003' || error.code === 'P2014') {
    return res.status(409).json({
      error: 'Não é possível excluir esta categoria porque existem eventos vinculados',
    });
  }

  console.error(`Erro ao ${operacao} categoria:`, error);

  return res.status(500).json({
    error: `Erro interno ao ${operacao} categoria`,
  });
};

// Listar categorias
export const listar = async (req, res) => {
  try {
    const { ativo, page = 1, limit = 10 } = req.query;

    const where = ativo !== undefined
      ? { ativo: ativo === 'true' }
      : {};

    const [categorias, total] = await Promise.all([
      prisma.categoria.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.categoria.count({ where }),
    ]);

    return res.json({
      data: categorias,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    return tratarErro(res, error, 'listar');
  }
};

// Buscar categoria por ID
export const buscarPorId = async (req, res) => {
  const id = obterId(req.params.id);

  if (!id) {
    return res.status(400).json({
      error: 'ID de categoria inválido',
    });
  }

  try {
    const categoria = await prisma.categoria.findUnique({
      where: { id },
    });

    if (!categoria) {
      return res.status(404).json({
        error: 'Categoria não encontrada',
      });
    }

    return res.json({
      data: categoria,
    });
  } catch (error) {
    return tratarErro(res, error, 'buscar');
  }
};

// Criar categoria
export const criar = async (req, res) => {
  try {
    const data = categoriaSchema.parse(req.body);

    const categoria = await prisma.categoria.create({
      data,
    });

    return res.status(201).json({
      message: 'Categoria criada com sucesso',
      data: categoria,
    });
  } catch (error) {
    return tratarErro(res, error, 'criar');
  }
};

// Atualizar categoria
export const atualizar = async (req, res) => {
  const id = obterId(req.params.id);

  if (!id) {
    return res.status(400).json({
      error: 'ID de categoria inválido',
    });
  }

  try {
    const data = categoriaSchema.parse(req.body);

    const categoria = await prisma.categoria.update({
      where: { id },
      data,
    });

    return res.json({
      message: 'Categoria atualizada com sucesso',
      data: categoria,
    });
  } catch (error) {
    return tratarErro(res, error, 'atualizar');
  }
};

// Excluir categoria
export const deletar = async (req, res) => {
  const id = obterId(req.params.id);

  if (!id) {
    return res.status(400).json({
      error: 'ID de categoria inválido',
    });
  }

  try {
    await prisma.categoria.delete({
      where: { id },
    });

    return res.json({
      message: 'Categoria excluída com sucesso',
    });
  } catch (error) {
    return tratarErro(res, error, 'excluir');
  }
};
