# 🏀 Esporte e Comunidade - Back-end

API REST completa para plataforma de eventos esportivos e comunitários, desenvolvida para o **Desafio Tech 2026 - SENAI Valinhos**.

## 📋 Sobre o Projeto

Sistema que resolve a dificuldade de organizadores em reunir participantes e reservar atividades esportivas. Permite criar eventos, gerenciar inscrições com controle de vagas, lista de espera, check-in e avaliações.

O sistema trabalha com dois tipos de usuários:

- **ORGANIZADOR:** possui permissões administrativas para gerenciar eventos, usuários, categorias, locais, inscrições e avaliações.
- **PARTICIPANTE:** pode consultar eventos, realizar inscrições, cancelar suas próprias inscrições e avaliar eventos após confirmar presença.

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

```text
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
| Organizador | organizador@esporte.com | senha123 | ORGANIZADOR |
| Participante | joao@esporte.com | senha123 | PARTICIPANTE |

**Importante:** o cadastro público cria contas com o papel `PARTICIPANTE`. Contas de `ORGANIZADOR` são criadas por um processo controlado, como o seed.

## 🧪 Testes

```bash
# Modo watch
npm run test

# CI
npm run test:ci
```

## 📊 Endpoints Principais

Todas as rotas protegidas exigem autenticação JWT, exceto quando indicado como públicas.

### Autenticação

- `POST /api/auth/register` - Cadastro público de participante
- `POST /api/auth/login` - Login (retorna JWT)
- `GET /api/auth/me` - Consultar perfil do usuário autenticado
- `PUT /api/auth/me` - Atualizar próprio perfil
- `PUT /api/auth/password` - Alterar senha

### Usuários

- `GET /api/usuarios` - Listar usuários (organizador)
- `GET /api/usuarios/:id` - Consultar usuário (próprio usuário ou organizador)
- `PUT /api/usuarios/:id` - Atualizar usuário (próprio usuário ou organizador)
- `DELETE /api/usuarios/:id` - Excluir usuário (próprio usuário ou organizador)

### Eventos

- `GET /api/eventos` - Listar eventos com filtros por categoria, local, data, busca e paginação
- `GET /api/eventos/:id` - Consultar detalhes de um evento
- `GET /api/eventos/minhas` - Listar eventos pelo painel do organizador
- `POST /api/eventos` - Criar evento (organizador)
- `PUT /api/eventos/:id` - Atualizar evento (organizador)
- `DELETE /api/eventos/:id` - Excluir evento (organizador)

### Categorias

- `GET /api/categorias` - Listar categorias
- `GET /api/categorias/:id` - Consultar categoria
- `POST /api/categorias` - Criar categoria (organizador)
- `PUT /api/categorias/:id` - Atualizar categoria (organizador)
- `DELETE /api/categorias/:id` - Excluir categoria (organizador)

### Locais

- `GET /api/locais` - Listar locais
- `GET /api/locais/:id` - Consultar local
- `POST /api/locais` - Criar local (organizador)
- `PUT /api/locais/:id` - Atualizar local (organizador)
- `DELETE /api/locais/:id` - Excluir local (organizador)

### Inscrições

- `POST /api/inscricoes` - Realizar inscrição (participante autenticado)
- `GET /api/inscricoes/minhas` - Consultar próprias inscrições
- `GET /api/inscricoes/evento/:id` - Consultar participantes de um evento (organizador)
- `PATCH /api/inscricoes/:id/cancelar` - Cancelar inscrição (titular ou organizador)
- `PATCH /api/inscricoes/:id/checkin` - Realizar check-in (organizador)

### Avaliações
- `POST /api/avaliacoes` - Avaliar evento (apenas se presente)
- `GET /api/avaliacoes/evento/:id` - Avaliações do evento
- `GET /api/avaliacoes/:id` - Consultar avaliação
- `PUT /api/avaliacoes/:id` - Atualizar avaliação (autor/admin)
- `DELETE /api/avaliacoes/:id` - Excluir avaliação (autor/admin)

### Dashboard

- `GET /api/dashboard/estatisticas` - Consultar estatísticas gerais do sistema (organizador)
- `GET /api/dashboard/eventos-populares` - Consultar os cinco eventos mais populares (organizador)

## 📋 Regras de Negócio (RN)

| ID | Regra |
|----|-------|
| RN01 | Eventos ativos e futuros aceitam inscrições. |
| RN02 | Quando não há vagas disponíveis, o participante é direcionado à lista de espera. |
| RN03 | Um usuário não pode se inscrever duas vezes no mesmo evento. |
| RN04 | O organizador possui permissões administrativas para gerenciar eventos, usuários, categorias e locais. |
| RN05 | O cancelamento de uma inscrição libera a vaga ou promove a próxima pessoa da lista de espera. |
| RN06 | Apenas participantes com check-in realizado podem avaliar um evento. |
| RN07 | Cada participante pode avaliar um evento uma única vez, com nota entre 1 e 5. |
| RN08 | O sistema não permite excluir eventos com inscrições confirmadas. |
| RN09 | Eventos não podem ser criados ou atualizados com datas no passado. |
| RN10 | Participantes só podem gerenciar suas próprias contas e inscrições, respeitando as permissões do organizador. |

## 📦 Deploy (Render)

1. Conecte o repositório ao Render.
2. Configure as variáveis de ambiente (`DATABASE_URL`, `JWT_SECRET` etc.).
3. Build Command:

```bash
npm install && npx prisma generate
```

4. Start Command:

```bash
npm start
```

5. Execute as migrações:

```bash
npx prisma migrate deploy
```

## 📄 Documentação Adicional

- `docs/API_DOCUMENTATION.md` - Detalhes da API para Insomnia/Postman.
- `docs/TEST_CASES.md` - Matriz de testes.

## 👥 Equipe

Desenvolvido para o Desafio Tech 2026 - SENAI Valinhos - Técnico em Desenvolvimento de Sistemas.