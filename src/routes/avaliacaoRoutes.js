import express from 'express';
import * as controller from '../controllers/avaliacaoController.js';
import { authenticate } from '../lib/middlewares/auth.js';

const router = express.Router();

router.post('/', authenticate, controller.criar);
router.get('/evento/:id', controller.listarPorEvento);

export default router;