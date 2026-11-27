
import { prisma } from '../lib/services/prismaClient.js';
import { z } from 'zod';

const eventoSchema = z.object({
  titulo: z.string().min(3),
  descricao: z.string().min(3),
  dataHora: z.string().datetime('Data inválida'),
  duracaoMin: z.number().int().positive().default(60),
  vagasTotal: z.number().int().positive(),
  preco: z.number().nonnegative().default(0),
  categoriaId: z.number().int().positive(),
  localId: z.number().int().positive(),
  imagemUrl: z.string().optional(),
}).strict();

const filtrosSchema = z.object({
  categoria: z.coerce.number().int().positive().optional(),
  local: z.coerce.number().int().positive().optional(),
  data: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((valor) => {
      const data = new Date(`${valor}T00:00:00.000Z`);
      return !Number.isNaN(data.getTime()) &&
        data.toISOString().slice(0, 10) === valor;
    }, 'Data inválida')
    .optional(),
  q: z.string().optional(),
  status: z.enum(['ATIVO', 'CANCELADO', 'FINALIZADO']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

const paginacaoSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// Valida IDs das rotas
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
      error: 'Evento não encontrado',
    });
  }

  if (error.code === 'P2002') {
    return res.status(409).json({
      error: 'Conflito ao processar o evento',
    });
  }

  if (error.code === 'P2003' || error.code === 'P2014') {
    return res.status(409).json({
      error: 'Não é possível realizar esta operação devido a registros vinculados',
    });
  }

  console.error(`Erro ao ${operacao} evento:`, error);

  return res.status(500).json({
    error: `Erro interno ao ${operacao} evento`,
  });
};

// Verifica se categoria e local existem
const validarReferencias = async (data) => {
  const [categoria, local] = await Promise.all([
    prisma.categoria.findUnique({
      where: { id: data.categoriaId },
    }),
    prisma.local.findUnique({
      where: { id: data.localId },
    }),
  ]);

  if (!categoria) {
    return {
      status: 404,
      error: 'Categoria não encontrada',
    };
  }

  if (!local) {
    return {
      status: 404,
      error: 'Local não encontrado',
    };
  }

  return null;
};

// Formata os dados do evento com vagas ocupadas
const formatarEvento = (evento) => ({
  ...evento,
  vagasOcupadas: evento.vagasTotal - evento.vagasDisponiveis,
});

// Listar eventos
export const listar = async (req, res) => {
  try {
    const filtros = filtrosSchema.parse(req.query);

    const {
      categoria,
      local,
      data,
      q,
      status,
      page,
      limit,
    } = filtros;

    const where = {};

    if (categoria) where.categoriaId = categoria;
    if (local) where.localId = local;
    if (status) where.status = status;

    if (data) {
      const inicio = new Date(`${data}T00:00:00.000Z`);
      const fim = new Date(inicio);
      fim.setUTCDate(fim.getUTCDate() + 1);

      where.dataHora = {
        gte: inicio,
        lt: fim,
      };
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
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { dataHora: 'asc' },
        include: {
          categoria: true,
          local: true,
          organizador: {
            select: { id: true, nome: true },
          },
        },
      }),
      prisma.evento.count({ where }),
    ]);

    return res.json({
      data: eventos.map(formatarEvento),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return tratarErro(res, error, 'listar');
  }
};

// Buscar evento por ID
export const buscarPorId = async (req, res) => {
  const id = obterId(req.params.id);

  if (!id) {
    return res.status(400).json({
      error: 'ID de evento inválido',
    });
  }

  try {
    const evento = await prisma.evento.findUnique({
      where: { id },
      include: {
        categoria: true,
        local: true,
        organizador: {
          select: { id: true, nome: true, email: true },
        },
      },
    });

    if (!evento) {
      return res.status(404).json({
        error: 'Evento não encontrado',
      });
    }

    return res.json({
      data: formatarEvento(evento),
    });
  } catch (error) {
    return tratarErro(res, error, 'buscar');
  }
};

// Criar evento
export const criar = async (req, res) => {
  try {
    const data = eventoSchema.parse(req.body);
    const dataHora = new Date(data.dataHora);

    if (dataHora <= new Date()) {
      return res.status(400).json({
        error: 'Data do evento deve ser futura',
      });
    }

    const referenciaInvalida = await validarReferencias(data);

    if (referenciaInvalida) {
      return res.status(referenciaInvalida.status).json({
        error: referenciaInvalida.error,
      });
    }

    const evento = await prisma.evento.create({
      data: {
        ...data,
        dataHora,
        vagasDisponiveis: data.vagasTotal,
        organizadorId: req.usuario.id,
      },
      include: {
        categoria: true,
        local: true,
      },
    });

    return res.status(201).json({
      message: 'Evento criado com sucesso',
      data: evento,
    });
  } catch (error) {
    return tratarErro(res, error, 'criar');
  }
};

// Atualizar evento
export const atualizar = async (req, res) => {
  const id = obterId(req.params.id);

  if (!id) {
    return res.status(400).json({
      error: 'ID de evento inválido',
    });
  }

  try {
    const evento = await prisma.evento.findUnique({
      where: { id },
    });

    if (!evento) {
      return res.status(404).json({
        error: 'Evento não encontrado',
      });
    }

    if (
      evento.organizadorId !== req.usuario.id &&
      req.usuario.papel !== 'ORGANIZADOR'
    ) {
      return res.status(403).json({
        error: 'Apenas o organizador pode editar este evento',
      });
    }

    const data = eventoSchema.parse(req.body);
    const dataHora = new Date(data.dataHora);

    if (dataHora <= new Date()) {
      return res.status(400).json({
        error: 'Data do evento deve ser futura',
      });
    }

    const vagasOcupadas =
      evento.vagasTotal - evento.vagasDisponiveis;

    if (data.vagasTotal < vagasOcupadas) {
      return res.status(400).json({
        error: 'O total de vagas não pode ser menor que a quantidade já ocupada',
      });
    }

    const referenciaInvalida = await validarReferencias(data);

    if (referenciaInvalida) {
      return res.status(referenciaInvalida.status).json({
        error: referenciaInvalida.error,
      });
    }

    const vagasDisponiveis = data.vagasTotal - vagasOcupadas;

    const eventoAtualizado = await prisma.evento.update({
      where: { id },
      data: {
        ...data,
        dataHora,
        vagasDisponiveis,
      },
      include: {
        categoria: true,
        local: true,
      },
    });

    return res.json({
      message: 'Evento atualizado com sucesso',
      data: eventoAtualizado,
    });
  } catch (error) {
    return tratarErro(res, error, 'atualizar');
  }
};

// Excluir evento
export const deletar = async (req, res) => {
  const id = obterId(req.params.id);

  if (!id) {
    return res.status(400).json({
      error: 'ID de evento inválido',
    });
  }

  try {
    const evento = await prisma.evento.findUnique({
      where: { id },
    });

    if (!evento) {
      return res.status(404).json({
        error: 'Evento não encontrado',
      });
    }

    if (
      evento.organizadorId !== req.usuario.id &&
      req.usuario.papel !== 'ORGANIZADOR'
    ) {
      return res.status(403).json({
        error: 'Apenas o organizador pode excluir este evento',
      });
    }

    const inscricoes = await prisma.inscricao.count({
      where: {
        eventoId: id,
        status: {
          in: ['CONFIRMADO', 'PRESENTE'],
        },
      },
    });

    if (inscricoes > 0) {
      return res.status(409).json({
        error: 'Não é possível excluir evento com inscrições confirmadas ou participantes presentes',
      });
    }

    await prisma.evento.delete({
      where: { id },
    });

    return res.json({
      message: 'Evento excluído com sucesso',
    });
  } catch (error) {
    return tratarErro(res, error, 'excluir');
  }
};

// Listar eventos do organizador autenticado
export const meusEventos = async (req, res) => {
  try {
    const { page, limit } = paginacaoSchema.parse(req.query);

    const where = {
      organizadorId: req.usuario.id,
    };

    const [eventos, total] = await Promise.all([
      prisma.evento.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { dataHora: 'desc' },
        include: {
          categoria: true,
          local: true,
        },
      }),
      prisma.evento.count({ where }),
    ]);

    return res.json({
      data: eventos.map(formatarEvento),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return tratarErro(res, error, 'listar eventos do organizador');
  }
};
