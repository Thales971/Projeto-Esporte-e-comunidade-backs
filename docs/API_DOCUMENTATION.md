# Documentação da API - Esporte e Comunidade

Base URL: `http://localhost:3001/api`

## Autenticação

Todas as rotas protegidas requerem header:
```
Authorization: Bearer <JWT_TOKEN>
```

## Endpoints

### POST /auth/register
Cadastra novo usuário.
Body: `{ nome, email, senha, telefone?, papel? }`

### POST /auth/login
Autentica e retorna JWT.
Body: `{ email, senha }`

### GET /auth/me
Retorna dados do usuário logado.

### GET /eventos
Lista eventos com filtros e paginação.
Query: `categoria`, `local`, `data`, `q` (busca), `status`, `page`, `limit`

### POST /eventos
Cria evento (requer papel ORGANIZADOR ou ADMIN).
Body: `{ titulo, descricao, dataHora, duracaoMin?, vagasTotal, preco?, categoriaId, localId, imagemUrl? }`

### POST /inscricoes
Inscreve usuário em evento. Controla vagas e lista de espera.
Body: `{ eventoId }`

### PATCH /inscricoes/:id/cancelar
Cancela inscrição e libera vaga.

### PATCH /inscricoes/:id/checkin
Confirma presença (apenas organizador do evento).

### POST /avaliacoes
Avalia evento (apenas se status PRESENTE).
Body: `{ eventoId, nota (1-5), comentario? }`

### GET /dashboard/estatisticas
Retorna estatísticas gerais do sistema.

## Códigos de Resposta

- 200: Sucesso
- 201: Criado
- 202: Aceito (lista de espera)
- 400: Dados inválidos / regra de negócio violada
- 401: Não autenticado
- 403: Acesso negado
- 404: Não encontrado
- 409: Conflito (duplicado, email existente, etc.)
- 500: Erro interno