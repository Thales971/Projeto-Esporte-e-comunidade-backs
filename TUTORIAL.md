# 🚀 Tutorial Rápido — Back-end Esporte e Comunidade
**Para: Lucas e Kaike**  
**Objetivo:** Terminar o back-end + banco de dados HOJE.

---

## 1. Pré-requisitos (instale se não tiver)

| Ferramenta | Como baixar |
|------------|-------------|
| **Node.js 18+** | [nodejs.org](https://nodejs.org/) |
| **PostgreSQL** | [postgresql.org](https://www.postgresql.org/download/) ou use Supabase/Railway |
| **Git** | [git-scm.com](https://git-scm.com/) |

Verifique no terminal:
```bash
node -v
npm -v
psql --version   # ou use pgAdmin / Supabase
```

---

## 2. Instalar dependências

No terminal, dentro da pasta `backend`:

```bash
cd c:\Users\alunods\Desktop\projeto-esporte-comunidade\backend
npm install
```

---

## 3. Configurar variáveis de ambiente

Copie o exemplo:

```bash
copy .env.example .env
```

Abra o arquivo `.env` e edite pelo menos estas linhas:

```env
PORT=3001
DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/esporte_comunidade?pgbouncer=true"
DIRECT_URL="postgresql://postgres:SUA_SENHA@localhost:5432/esporte_comunidade"
JWT_SECRET="qualquer_coisa_secreta_aqui"
JWT_EXPIRES_IN="7d"
BCRYPT_SALT_ROUNDS=10
FRONTEND_URL="http://localhost:5173"
```

> ⚠️ Se estiver usando **Supabase**, coloque a connection string com pooling no `DATABASE_URL` e a direta no `DIRECT_URL`.

---

## 4. Criar o banco de dados

No PostgreSQL (pgAdmin, psql ou Supabase SQL Editor), execute:

```sql
CREATE DATABASE esporte_comunidade;
```

---

## 5. Rodar o Prisma

```bash
# Gerar o cliente Prisma
npx prisma generate

# Criar as tabelas no banco
npx prisma migrate dev --name init

# Popular com dados de demonstração (usuários, categorias, eventos)
npx prisma db seed
```

Após o seed, você terá estes usuários de teste:

| Email | Senha | Papel |
|-------|-------|-------|
| admin@esporte.com | senha123 | ADMIN |
| organizador@esporte.com | senha123 | ORGANIZADOR |
| joao@esporte.com | senha123 | PARTICIPANTE |

---

## 6. Subir o servidor

```bash
npm run dev
```

Você verá:
```
🚀 Servidor rodando em http://localhost:3001
📚 Documentação da API: http://localhost:3001/api-docs
```

Abra no navegador: **http://localhost:3001/api-docs**  
Lá você testa todos os endpoints diretamente (Swagger).

---

## 7. Endpoints principais para testar hoje

| Método | Endpoint | Descrição | Autenticação |
|--------|----------|-----------|--------------|
| POST | `/api/auth/register` | Criar usuário | Não |
| POST | `/api/auth/login` | Login (retorna JWT) | Não |
| GET | `/api/eventos` | Listar eventos (com filtros e paginação) | Não |
| POST | `/api/eventos` | Criar evento | Sim (Organizador/Admin) |
| POST | `/api/inscricoes` | Inscrever em evento | Sim (qualquer usuário logado) |
| GET | `/api/inscricoes/minhas` | Minhas inscrições | Sim |
| PATCH | `/api/inscricoes/:id/cancelar` | Cancelar inscrição | Sim |
| PATCH | `/api/inscricoes/:id/checkin` | Check-in (presença) | Sim (Organizador do evento) |
| POST | `/api/avaliacoes` | Avaliar evento (apenas se presente) | Sim |
| GET | `/api/dashboard/estatisticas` | Estatísticas gerais | Sim |

> Para rotas protegidas, envie o header: `Authorization: Bearer <TOKEN_DO_LOGIN>`

---

## 8. Testes automatizados

```bash
npm run test:ci
```

---

## 9. Problemas comuns

| Erro | Solução |
|------|---------|
| `Erro de conexão com banco` | Confira se o PostgreSQL está rodando e se a senha no `.env` está correta |
| `Prisma Client não encontrado` | Rode `npx prisma generate` |
| `Tabela não existe` | Rode `npx prisma migrate dev --name init` |
| `JWT_SECRET não definido` | Preencha o `JWT_SECRET` no `.env` e reinicie o servidor |

---

## 10. Checklist de entrega (hoje)

- [ ] `.env` configurado
- [ ] Banco `esporte_comunidade` criado
- [ ] `npx prisma generate` executado
- [ ] `npx prisma migrate dev` executado
- [ ] `npx prisma db seed` executado
- [ ] Servidor rodando na porta 3001
- [ ] Swagger acessível em `/api-docs`
- [ ] Login funcionando com os 3 usuários de demo
- [ ] CRUD de eventos funcionando
- [ ] Inscrição com controle de vagas funcionando
- [ ] Testes passando (`npm run test:ci`)

---

**Dúvidas?** Chame no grupo da equipe ou abra uma Issue no GitHub. 💪