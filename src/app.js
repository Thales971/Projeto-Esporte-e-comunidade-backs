import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import 'dotenv/config';

import authRoutes from './routes/authRoutes.js';
import usuarioRoutes from './routes/usuarioRoutes.js';
import categoriaRoutes from './routes/categoriaRoutes.js';
import localRoutes from './routes/localRoutes.js';
import eventoRoutes from './routes/eventoRoutes.js';
import inscricaoRoutes from './routes/inscricaoRoutes.js';
import avaliacaoRoutes from './routes/avaliacaoRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import { errorHandler } from './lib/middlewares/errorHandler.js';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger/swagger.js';

const app = express();

const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(helmet());
app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/', (req, res) => res.json({ message: 'API online', docs: '/api-docs' }));
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/locais', localRoutes);
app.use('/api/eventos', eventoRoutes);
app.use('/api/inscricoes', inscricaoRoutes);
app.use('/api/avaliacoes', avaliacaoRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada' }));
app.use(errorHandler);

export default app;
