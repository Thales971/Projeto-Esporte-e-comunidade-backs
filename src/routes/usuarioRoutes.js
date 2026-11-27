import express from 'express';
import * as controller from '../controllers/usuarioController.js';
import { authenticate } from '../lib/middlewares/auth.js';
import { authorize } from '../lib/middlewares/role.js';

const router = express.Router();

router.get('/', authenticate, authorize('ADMIN', 'ORGANIZADOR'), controller.listar);
router.get('/:id', authenticate, controller.buscarPorId);
router.put('/:id', authenticate, controller.atualizar);
router.delete('/:id', authenticate, controller.deletar);

export default router;