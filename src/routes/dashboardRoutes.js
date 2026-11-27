import express from 'express';
import * as controller from '../controllers/dashboardController.js';
import { authenticate } from '../lib/middlewares/auth.js';
import { authorize } from '../lib/middlewares/role.js';

const router = express.Router();

router.get(
  '/estatisticas',
  authenticate,
  authorize('ORGANIZADOR'),
  controller.estatisticas
);

router.get(
  '/eventos-populares',
  authenticate,
  authorize('ORGANIZADOR'),
  controller.eventosPopulares
);

export default router;
