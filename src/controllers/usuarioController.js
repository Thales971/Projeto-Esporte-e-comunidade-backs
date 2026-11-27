import { prisma } from '../lib/services/prismaClient.js';
import { z } from 'zod';

const usuarioSchema = z.object({
  nome: z.string().min(3).optional(),
  email: z.string().email().optional(),
  telefone: z.string().optional(),
}).strict();  

export const listar = async (req, res) => {
  const { papel, q, page = 1, limit = 10 } = req.query;
  const where = {};
  if (papel) where.papel = papel;
  if (q) {
    where.OR = [
      { nome: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ];
  }
  const [usuarios, total] = await Promise.all([
    prisma.usuario.findMany({
      where,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      select: { id: true, nome: true, email: true, papel: true, telefone: true, fotoUrl: true, criadoEm: true },
    }),
    prisma.usuario.count({ where }),
  ]);
  return res.json({ data: usuarios, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) });
};


export const buscarPorId = async (req, res) => {
  const { id } = req.params;
  const usuarioId = Number(id);

  if (req.usuario.id !== usuarioId && req.usuario.papel !== 'ADMIN') {
    return res.status(403).json({
      error: 'Acesso negado',
    });
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
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

  return res.json({ data: usuario });
};


export const atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const data = usuarioSchema.parse(req.body);
    if (req.usuario.id !== Number(id) && req.usuario.papel !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    const usuario = await prisma.usuario.update({
      where: { id: Number(id) },
      data,
      select: { id: true, nome: true, email: true, papel: true, telefone: true },
    });
    return res.json({ message: 'Usuário atualizado', data: usuario });
    } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        detalhes: error.issues,
      });
    }

    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'E-mail já cadastrado',
      });
    }

    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Usuário não encontrado',
      });
    }

    console.error('Erro ao atualizar usuário:', error);

    return res.status(500).json({
      error: 'Erro interno ao atualizar usuário',
    });
  }
};


export const deletar = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: 'ID de usuário inválido',
      });
    }

    if (req.usuario.id !== id && req.usuario.papel !== 'ADMIN') {
      return res.status(403).json({
        error: 'Acesso negado',
      });
    }

    await prisma.usuario.delete({
      where: { id },
    });

    return res.json({
      message: 'Usuário excluído com sucesso',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Usuário não encontrado',
      });
    }

    if (error.code === 'P2003') {
      return res.status(409).json({
        error: 'Não é possível excluir este usuário porque existem registros vinculados à conta',
      });
    }

    console.error('Erro ao excluir usuário:', error);

    return res.status(500).json({
      error: 'Erro interno ao excluir usuário',
    });
  }
};
