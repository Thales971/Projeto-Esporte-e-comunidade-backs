import express from 'express';
import * as controller from '../controllers/eventoController.js';
import { authenticate } from '../lib/middlewares/auth.js';
import { authorize } from '../lib/middlewares/role.js';

const router = express.Router();

router.get('/', controller.listar);
router.get('/:id', controller.buscarPorId);
router.post('/', authenticate, authorize('ORGANIZADOR', 'ADMIN'), controller.criar);
router.put('/:id', authenticate, controller.atualizar);
router.delete('/:id', authenticate, controller.deletar);
router.get('/minhas', authenticate, controller.meusEventos);

export default router;