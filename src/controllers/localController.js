
import { prisma } from '../lib/services/prismaClient.js';
import { z } from 'zod';

const localSchema = z.object({
  nome: z.string().min(3),
  endereco: z.string().min(3),
  cidade: z.string().min(3),
  cep: z.string().min(5),
  capacidade: z.number().int().positive().optional(),
  tipo: z.string().default('Quadra'),
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
      error: 'Local não encontrado',
    });
  }

  if (error.code === 'P2002') {
    return res.status(409).json({
      error: 'Já existe um local com esses dados',
    });
  }

  if (error.code === 'P2003' || error.code === 'P2014') {
    return res.status(409).json({
      error: 'Não é possível excluir este local porque existem eventos vinculados',
    });
  }

  console.error(`Erro ao ${operacao} local:`, error);

  return res.status(500).json({
    error: `Erro interno ao ${operacao} local`,
  });
};

// Listar locais
export const listar = async (req, res) => {
  try {
    const { ativo, tipo, page = 1, limit = 10 } = req.query;

    const where = {};

    if (ativo !== undefined) {
      where.ativo = ativo === 'true';
    }

    if (tipo) {
      where.tipo = tipo;
    }

    const [locais, total] = await Promise.all([
      prisma.local.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.local.count({ where }),
    ]);

    return res.json({
      data: locais,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    return tratarErro(res, error, 'listar');
  }
};

// Buscar local por ID
export const buscarPorId = async (req, res) => {
  const id = obterId(req.params.id);

  if (!id) {
    return res.status(400).json({
      error: 'ID de local inválido',
    });
  }

  try {
    const local = await prisma.local.findUnique({
      where: { id },
    });

    if (!local) {
      return res.status(404).json({
        error: 'Local não encontrado',
      });
    }

    return res.json({
      data: local,
    });
  } catch (error) {
    return tratarErro(res, error, 'buscar');
  }
};

// Criar local
export const criar = async (req, res) => {
  try {
    const data = localSchema.parse(req.body);

    const local = await prisma.local.create({
      data,
    });

    return res.status(201).json({
      message: 'Local criado com sucesso',
      data: local,
    });
  } catch (error) {
    return tratarErro(res, error, 'criar');
  }
};

// Atualizar local
export const atualizar = async (req, res) => {
  const id = obterId(req.params.id);

  if (!id) {
    return res.status(400).json({
      error: 'ID de local inválido',
    });
  }

  try {
    const data = localSchema.parse(req.body);

    const local = await prisma.local.update({
      where: { id },
      data,
    });

    return res.json({
      message: 'Local atualizado com sucesso',
      data: local,
    });
  } catch (error) {
    return tratarErro(res, error, 'atualizar');
  }
};

// Excluir local
export const deletar = async (req, res) => {
  const id = obterId(req.params.id);

  if (!id) {
    return res.status(400).json({
      error: 'ID de local inválido',
    });
  }

  try {
    await prisma.local.delete({
      where: { id },
    });

    return res.json({
      message: 'Local excluído com sucesso',
    });
  } catch (error) {
    return tratarErro(res, error, 'excluir');
  }
};
