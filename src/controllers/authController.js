import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/services/prismaClient.js';
import { z } from 'zod';

const registerSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  telefone: z.string().optional(),
  papel: z.enum(['ORGANIZADOR', 'PARTICIPANTE']).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string(),
});

export const register = async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    const existe = await prisma.usuario.findUnique({ where: { email: data.email } });
    if (existe) {
      return res.status(409).json({ error: 'E-mail já cadastrado' });
    }
    const senhaHash = await bcrypt.hash(data.senha, Number(process.env.BCRYPT_SALT_ROUNDS) || 10);
    const usuario = await prisma.usuario.create({
      data: {
        nome: data.nome,
        email: data.email,
        senha: senhaHash,
        telefone: data.telefone,
        papel: data.papel || 'PARTICIPANTE',
      },
      select: { id: true, nome: true, email: true, papel: true, criadoEm: true },
    });
    return res.status(201).json({ message: 'Usuário cadastrado com sucesso', data: usuario });
  } catch (error) {
    if (error.errors) {
      return res.status(400).json({ error: 'Dados inválidos', detalhes: error.errors });
    }
    return res.status(500).json({ error: 'Erro ao cadastrar usuário' });
  }
};

export const login = async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);
    const usuario = await prisma.usuario.findUnique({ where: { email: data.email } });
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    const senhaValida = await bcrypt.compare(data.senha, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    const token = jwt.sign(
      { userId: usuario.id, papel: usuario.papel },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    return res.json({
      message: 'Login realizado com sucesso',
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel },
    });
  } catch (error) {
    if (error.errors) {
      return res.status(400).json({ error: 'Dados inválidos', detalhes: error.errors });
    }
    return res.status(500).json({ error: 'Erro ao fazer login' });
  }
};

export const me = async (req, res) => {
  return res.json({ usuario: req.usuario });
};

export const updateProfile = async (req, res) => {
  try {
    const schema = z.object({
      nome: z.string().min(3).optional(),
      telefone: z.string().optional(),
    }).strict();

    const data = schema.parse(req.body);

    const usuario = await prisma.usuario.update({
      where: { id: req.usuario.id },
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
      message: 'Perfil atualizado com sucesso',
      data: usuario,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        detalhes: error.errors,
      });
    }

    return res.status(500).json({
      error: 'Erro ao atualizar perfil',
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { senhaAtual, novaSenha } = req.body;
    const usuario = await prisma.usuario.findUnique({ where: { id: req.usuario.id } });
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    const valida = await bcrypt.compare(senhaAtual, usuario.senha);
    if (!valida) {
      return res.status(401).json({ error: 'Senha atual incorreta' });
    }
    const hash = await bcrypt.hash(novaSenha, Number(process.env.BCRYPT_SALT_ROUNDS) || 10);
    await prisma.usuario.update({ where: { id: req.usuario.id }, data: { senha: hash } });
    return res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao alterar senha' });
  }
};