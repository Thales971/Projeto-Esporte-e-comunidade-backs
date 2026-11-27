# 🏀 Esporte e Comunidade - Back-end

API REST completa para plataforma de eventos esportivos e comunitários, desenvolvida para o **Desafio Tech 2026 - SENAI Valinhos**.

## 📋 Sobre o Projeto

Sistema que resolve a dor de organizadores que têm dificuldade em reunir participantes e reservar atividades esportivas. Permite criar eventos, gerenciar inscrições com controle de vagas, lista de espera, check-in e avaliações.

## 🛠️ Tecnologias

- **Node.js** + **Express 5.x** (ESM)
- **Prisma ORM** + **PostgreSQL**
- **JWT** + **bcryptjs** (autenticação e senhas com hash)
- **Zod** (validação de entrada)
- **Swagger/OpenAPI** (documentação automática)
- **Multer + Sharp** (upload de imagens)
- **Jest + Supertest** (testes de API)
- **Helmet + CORS** (segurança)

## 📁 Estrutura

```
backend/
├── prisma/
│   ├── schema.prisma          # DER com 7 entidades
│   ├── migrations/            # Migrações SQL
│   └── seed.js                # Dados fictícios para demonstração
├── src/
│   ├── lib/
│   │   ├── services/prismaClient.js
│   │   ├── middlewares/       # auth, role, validate, errorHandler
│   │   └── helpers/           # pagination, response
│   ├── controllers/           # auth, usuario, categoria, local, evento, inscricao, avaliacao, dashboard
│   ├── routes/                # Rotas REST organizadas
│   ├── swagger/               # Configuração OpenAPI
│   ├── app.js                 # Express app
│   └── server.js              # Inicialização do servidor
├── tests/                     # Testes de API (Jest + Supertest)
├── docs/                      # Documentação técnica
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## 🚀 Instalação Local

### Pré-requisitos
- Node.js 18+
- PostgreSQL
- npm ou yarn

### 1. Clone e instale
```bash
git clone <repositorio>
cd backend
npm install
```

### 2. Configure o ambiente
```bash
cp .env.example .env
# Edite o .env com suas credenciais do PostgreSQL
```

### 3. Banco de dados
```bash
# Gerar Prisma Client
npx prisma generate

# Criar banco e rodar migrações
npx prisma migrate dev --name init

# Popular com dados fictícios
npx prisma db seed
```

### 4. Executar
```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

Servidor: `http://localhost:3001`
Documentação: `http://localhost:3001/api-docs`

## 🔐 Credenciais de Demonstração (seed)

| Usuário | Email | Senha | Papel |
|---------|-------|-------|-------|
| Admin | admin@esporte.com | senha123 | ADMIN |
| Organizador | organizador@esporte.com | senha123 | ORGANIZADOR |
| Participante | joao@esporte.com | senha123 | PARTICIPANTE |

## 🧪 Testes

```bash
# Modo watch
npm run test

# CI
npm run test:ci
```

## 📊 Endpoints Principais

### Autenticação (público)
- `POST /api/auth/register` - Cadastro
- `POST /api/auth/login` - Login (retorna JWT)
- `GET /api/auth/me` - Perfil (protegido)
- `PUT /api/auth/me` - Atualizar perfil
- `PUT /api/auth/password` - Trocar senha

### Eventos (core)
- `GET /api/eventos` - Listar com filtros (categoria, local, data, busca, paginação)
- `GET /api/eventos/:id` - Detalhe do evento
- `POST /api/eventos` - Criar (organizador/admin)
- `PUT /api/eventos/:id` - Atualizar (organizador dono)
- `DELETE /api/eventos/:id` - Excluir (organizador/admin)
- `GET /api/eventos/minhas` - Meus eventos como organizador

### Inscrições (fluxo principal)
- `POST /api/inscricoes` - Inscrever (controla vagas e lista de espera)
- `GET /api/inscricoes/minhas` - Minhas inscrições
- `GET /api/inscricoes/evento/:id` - Participantes do evento (organizador)
- `PATCH /api/inscricoes/:id/cancelar` - Cancelar (libera vaga)
- `PATCH /api/inscricoes/:id/checkin` - Check-in (organizador)

### Avaliações
- `POST /api/avaliacoes` - Avaliar evento (apenas se presente)
- `GET /api/avaliacoes/evento/:id` - Avaliações do evento
- `GET /api/avaliacoes/:id` - Consultar avaliação
- `PUT /api/avaliacoes/:id` - Atualizar avaliação (autor/admin)
- `DELETE /api/avaliacoes/:id` - Excluir avaliação (autor/admin)

### Dashboard
- `GET /api/dashboard/estatisticas` - Estatísticas gerais
- `GET /api/dashboard/eventos-populares` - Eventos mais populares

## 📋 Regras de Negócio (RN)

| ID | Regra |
|----|-------|
| RN01 | Evento com 0 vagas disponíveis não aceita inscrição (lista de espera) |
| RN02 | Usuário não pode se inscrever duas vezes no mesmo evento |
| RN03 | Apenas o organizador pode editar/excluir seu evento |
| RN04 | Cancelamento libera vaga automaticamente |
| RN05 | Apenas quem fez check-in pode avaliar |
| RN06 | Nota de avaliação entre 1 e 5 |
| RN07 | Evento não pode ter data no passado |

## 📦 Deploy (Render)

1. Conecte o repositório ao Render
2. Configure variáveis de ambiente (DATABASE_URL, JWT_SECRET, etc.)
3. Build Command: `npm install && npx prisma generate`
4. Start Command: `npm start`
5. Execute migrações: `npx prisma migrate deploy`

## 📄 Documentação Adicional

- `docs/CRUD_SPECIFICATION.md` - ERS do CRUD, critérios de aceite, regras de negócio e rastreabilidade
- `docs/API_DOCUMENTATION.md` - Detalhes da API para Insomnia/Postman
- `docs/TEST_CASES.md` - Matriz de testes (10+ casos)

## 👥 Equipe

Desenvolvido para o Desafio Tech 2026 - SENAI Valinhos - Técnico em Desenvolvimento de Sistemas.