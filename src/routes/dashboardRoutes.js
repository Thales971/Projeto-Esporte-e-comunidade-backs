import express from 'express';
import * as controller from '../controllers/dashboardController.js';
import { authenticate } from '../lib/middlewares/auth.js';

const router = express.Router();

router.get('/estatisticas', authenticate, controller.estatisticas);
router.get('/eventos-populares', authenticate, controller.eventosPopulares);

export default router;