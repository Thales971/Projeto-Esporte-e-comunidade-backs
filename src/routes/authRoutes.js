import express from 'express';
import * as controller from '../controllers/authController.js';
import { validate } from '../lib/middlewares/validate.js';
import { authenticate } from '../lib/middlewares/auth.js';
import { z } from 'zod';

const router = express.Router();

const registerSchema = z.object({
  nome: z.string().min(3),
  email: z.string().email(),
  senha: z.string().min(6),
  telefone: z.string().optional(),
  papel: z.enum(['ORGANIZADOR', 'PARTICIPANTE']).optional(),
});
const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string(),
});

router.post('/register', validate(registerSchema), controller.register);
router.post('/login', validate(loginSchema), controller.login);
router.get('/me', authenticate, controller.me);
router.put('/me', authenticate, controller.updateProfile);
router.put('/password', authenticate, controller.changePassword);

export default router;