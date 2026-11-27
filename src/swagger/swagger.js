import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Esporte e Comunidade API',
      version: '1.0.0',
      description: 'API REST para plataforma de eventos esportivos e comunitários - SENAI Valinhos Desafio Tech 2026',
    },
    servers: [
      { url: 'http://localhost:3001/api', description: 'Desenvolvimento local' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtido no /api/auth/login',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'],
};

export default swaggerJsdoc(options);