import express from 'express';
import * as controller from '../controllers/localController.js';
import { authenticate } from '../lib/middlewares/auth.js';
import { authorize } from '../lib/middlewares/role.js';

const router = express.Router();

router.get('/', controller.listar);
router.get('/:id', controller.buscarPorId);
router.post('/', authenticate, authorize('ORGANIZADOR'), controller.criar);
router.put('/:id', authenticate, authorize('ORGANIZADOR'), controller.atualizar);
router.delete('/:id', authenticate, authorize('ORGANIZADOR'), controller.deletar);

export default router;