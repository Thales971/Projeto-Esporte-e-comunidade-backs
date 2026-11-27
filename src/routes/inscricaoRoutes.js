import express from 'express';
import * as controller from '../controllers/inscricaoController.js';
import { authenticate } from '../lib/middlewares/auth.js';
import { authorize } from '../lib/middlewares/role.js';

const router = express.Router();

router.post('/', authenticate, controller.criar);
router.get('/minhas', authenticate, controller.listarMinhas);
router.get('/evento/:id', authenticate, controller.listarPorEvento);
router.patch('/:id/cancelar', authenticate, controller.cancelar);
router.patch('/:id/checkin', authenticate, authorize('ORGANIZADOR', 'ADMIN'), controller.checkin);

export default router;