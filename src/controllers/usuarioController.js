
import { prisma } from '../lib/services/prismaClient.js';
import { z } from 'zod';

// Validação dos dados do usuário
const usuarioSchema = z.object({
  nome: z.string().min(3).optional(),
  email: z.string().email().optional(),
  telefone: z.string().optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Informe pelo menos um campo para atualizar' }
);

// Validação dos filtros e da paginação
const filtrosSchema = z.object({
  papel: z.enum(['ORGANIZADOR', 'PARTICIPANTE']).optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
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
      error: 'Usuário não encontrado',
    });
  }

  if (error.code === 'P2002') {
    return res.status(409).json({
      error: 'E-mail já cadastrado',
    });
  }

  if (error.code === 'P2003' || error.code === 'P2014') {
    return res.status(409).json({
      error: 'Não é possível excluir este usuário porque existem registros vinculados à conta',
    });
  }

  console.error(`Erro ao ${operacao} usuário:`, error);

  return res.status(500).json({
    error: `Erro interno ao ${operacao} usuário`,
  });
};

// Listar usuários
export const listar = async (req, res) => {
  try {
    const filtros = filtrosSchema.parse(req.query);

    const { papel, q, page, limit } = filtros;
    const where = {};

    if (papel) {
      where.papel = papel;
    }

    if (q) {
      where.OR = [
        { nome: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [usuarios, total] = await Promise.all([
      prisma.usuario.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          nome: true,
          email: true,
          papel: true,
          telefone: true,
          fotoUrl: true,
          criadoEm: true,
        },
      }),
      prisma.usuario.count({ where }),
    ]);

    return res.json({
      data: usuarios,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return tratarErro(res, error, 'listar');
  }
};

// Buscar usuário por ID
export const buscarPorId = async (req, res) => {
  const id = obterId(req.params.id);

  if (!id) {
    return res.status(400).json({
      error: 'ID de usuário inválido',
    });
  }

  if (req.usuario.id !== id && req.usuario.papel !== 'ORGANIZADOR') {
    return res.status(403).json({
      error: 'Acesso negado',
    });
  }

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        papel: true,
        telefone: true,
        fotoUrl: true,
        criadoEm: true,
      },
    });

    if (!usuario) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
      });
    }

    return res.json({
      data: usuario,
    });
  } catch (error) {
    return tratarErro(res, error, 'buscar');
  }
};

// Atualizar usuário
export const atualizar = async (req, res) => {
  const id = obterId(req.params.id);

  if (!id) {
    return res.status(400).json({
      error: 'ID de usuário inválido',
    });
  }

  try {
    const data = usuarioSchema.parse(req.body);

    if (req.usuario.id !== id && req.usuario.papel !== 'ORGANIZADOR') {
      return res.status(403).json({
        error: 'Acesso negado',
      });
    }

    const usuario = await prisma.usuario.update({
      where: { id },
      data,
      select: {
        id: true,
        nome: true,
        email: true,
        papel: true,
        telefone: true,
      },
    });

    return res.json({
      message: 'Usuário atualizado com sucesso',
      data: usuario,
    });
  } catch (error) {
    return tratarErro(res, error, 'atualizar');
  }
};

// Excluir usuário
export const deletar = async (req, res) => {
  const id = obterId(req.params.id);

  if (!id) {
    return res.status(400).json({
      error: 'ID de usuário inválido',
    });
  }

  if (req.usuario.id !== id && req.usuario.papel !== 'ORGANIZADOR') {
    return res.status(403).json({
      error: 'Acesso negado',
    });
  }

  try {
    await prisma.usuario.delete({
      where: { id },
    });

    return res.json({
      message: 'Usuário excluído com sucesso',
    });
  } catch (error) {
    return tratarErro(res, error, 'excluir');
  }
};
