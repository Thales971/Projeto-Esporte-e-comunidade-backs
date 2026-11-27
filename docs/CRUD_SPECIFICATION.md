# Especificação de Requisitos — CRUD e fluxos de negócio

## 1. Identificação e objetivo

**Produto:** Esporte e Comunidade  
**Contexto:** Desafio Tech 2026 — SENAI Valinhos  
**Objetivo:** permitir que organizadores divulguem atividades esportivas e que a comunidade encontre eventos, se inscreva, confirme presença e avalie a experiência.

Esta especificação descreve o CRUD das entidades do sistema e os fluxos de negócio relacionados. As operações respeitam o domínio: por exemplo, uma inscrição é cancelada em vez de apagada. Avaliações podem ser consultadas publicamente, mas somente o autor ou um administrador pode editá-las ou excluí-las.

## 2. Escopo

### Incluído

- Cadastro, autenticação e manutenção de usuários.
- Consulta e administração de categorias e locais.
- Consulta, criação, edição e exclusão de eventos.
- Inscrições, lista de espera, cancelamento e check-in.
- Registro, consulta, edição e exclusão de avaliações.
- Busca, filtros e paginação nas listagens aplicáveis.

### Fora do escopo desta versão

- Pagamentos e reembolsos.
- Notificações automáticas para a lista de espera.
- Aplicativo mobile.

## 3. Atores e permissões

| Ator | Responsabilidades e permissões |
|---|---|
| Visitante | Consultar eventos, categorias, locais e avaliações públicas; criar conta e autenticar-se. |
| Participante | Inscrever-se em eventos, consultar e cancelar suas inscrições, além de avaliar eventos após presença confirmada. |
| Organizador | Criar e administrar os próprios eventos; consultar participantes e realizar check-in. Também pode administrar categorias e locais. |
| Administrador | Administrar cadastros e executar operações restritas à administração. |

Operações protegidas exigem autenticação por token Bearer. As permissões específicas de cada requisito devem ser aplicadas também pela API, independentemente dos controles da interface.

## 4. Requisitos funcionais

Prioridades: **Alta** = essencial para o fluxo principal; **Média** = necessária para administração ou conclusão do fluxo.

| ID | Ator | Requisito | Prioridade | Critério de aceite |
|---|---|---|---|---|
| RF01 | Visitante | Criar uma conta com nome, e-mail e senha válidos. | Alta | A API retorna sucesso, persiste o usuário e nunca armazena a senha em texto puro; e-mail já cadastrado é rejeitado. |
| RF02 | Usuário | Autenticar-se com e-mail e senha e consultar a própria sessão. | Alta | Credenciais válidas retornam token; inválidas são rejeitadas sem revelar qual campo falhou. |
| RF03 | Visitante / usuário | Listar e buscar eventos por categoria, local, data, texto e status, com paginação. | Alta | A resposta contém somente eventos compatíveis com os filtros e os metadados de paginação; uma busca sem resultados retorna lista vazia. |
| RF04 | Visitante / usuário | Consultar os detalhes de um evento. | Alta | Um ID existente retorna os dados do evento e suas relações pertinentes; ID inexistente retorna 404. |
| RF05 | Organizador / administrador | Cadastrar um evento associado a uma categoria, local e organizador. | Alta | Dados válidos criam o evento com vagas disponíveis iguais ao total; data passada, campos inválidos ou referências inexistentes são rejeitados. |
| RF06 | Organizador / administrador | Atualizar os dados de um evento que administra. | Alta | Dados válidos persistem e são retornados; usuário sem permissão recebe 403 e evento inexistente recebe 404. |
| RF07 | Organizador / administrador | Excluir um evento que administra quando não houver inscrições confirmadas. | Média | A exclusão permitida remove o evento; havendo inscrição confirmada, a API bloqueia a operação e informa o conflito. |
| RF08 | Organizador / administrador | Criar, consultar, atualizar e administrar categorias de eventos. | Média | Operações retornam os dados persistidos; exclusão de categoria vinculada a evento é bloqueada. |
| RF09 | Organizador / administrador | Criar, consultar, atualizar e administrar locais de atividades. | Média | Operações retornam os dados persistidos; exclusão de local vinculado a evento é bloqueada. |
| RF10 | Participante | Solicitar inscrição em evento ativo e futuro. | Alta | Com vaga, a inscrição é persistida, associada ao usuário autenticado e reduz as vagas disponíveis em uma unidade. |
| RF11 | Participante | Entrar na lista de espera de um evento sem vagas disponíveis. | Alta | A solicitação não confirma uma inscrição nem reduz vagas e retorna confirmação de entrada na lista de espera. |
| RF12 | Participante / organizador | Consultar inscrições próprias ou participantes do evento, conforme permissão. | Alta | Participante consulta apenas as próprias inscrições; organizador do evento ou administrador pode consultar os participantes daquele evento. |
| RF13 | Participante | Cancelar uma inscrição própria. | Alta | O status passa a cancelado e uma vaga é liberada uma única vez; tentativa não permitida é rejeitada. |
| RF14 | Organizador / administrador | Registrar o check-in de um participante inscrito. | Alta | A inscrição passa ao estado de presença confirmada e recebe a data/hora do check-in; ator sem permissão é rejeitado. |
| RF15 | Participante presente | Registrar uma avaliação de evento com nota de 1 a 5 e comentário opcional. | Média | Avaliação válida é persistida; participante sem presença confirmada, nota fora do intervalo ou segunda avaliação são rejeitados. |
| RF16 | Visitante / usuário | Consultar avaliações de um evento ou uma avaliação pelo ID. | Média | A API retorna os dados da avaliação e do autor, ou a lista, média e quantidade; ID inexistente retorna 404. |
| RF17 | Autor / administrador | Atualizar nota e comentário de uma avaliação. | Média | Autor ou administrador pode atualizar somente nota (inteira de 1 a 5) e comentário; outros usuários recebem 403 e avaliação inexistente retorna 404. |
| RF18 | Autor / administrador | Excluir uma avaliação. | Média | Autor ou administrador pode excluir a avaliação; outros usuários recebem 403 e avaliação inexistente retorna 404. |

## 5. Requisitos não funcionais

| ID | Requisito verificável | Verificação |
|---|---|---|
| RNF01 — Segurança | Senhas devem ser armazenadas com hash; segredos e credenciais devem vir de variáveis de ambiente; rotas protegidas devem validar token e permissão no servidor. | Inspecionar configuração e banco; testar acesso sem token, token inválido e papel sem permissão. |
| RNF02 — Usabilidade | A interface web deverá funcionar em largura mínima de 360 px, com mensagens compreensíveis de carregamento, sucesso e erro nos fluxos principais. | Testar os fluxos em viewport de 360 px e observar ausência de rolagem horizontal indevida e feedback em cada resultado. |
| RNF03 — Desempenho | Em ambiente de demonstração e com até 20 requisições simultâneas, as consultas paginadas de eventos deverão responder em até 2 segundos no percentil 95. | Executar teste de carga documentado e registrar ambiente, volume e percentil medido. |
| RNF04 — Acessibilidade | Formulários e ações principais devem ser operáveis por teclado, ter rótulos associados aos campos e apresentar foco visível. | Percorrer cadastro, busca e inscrição somente com teclado e inspecionar nomes/rótulos acessíveis. |
| RNF05 — Confiabilidade | Operações de inscrição e cancelamento devem preservar a consistência entre status da inscrição e vagas disponíveis, sem liberar ou consumir a mesma vaga mais de uma vez. | Repetir solicitações e cancelamentos e conferir os estados persistidos e a contagem de vagas no banco. |

## 6. Regras de negócio

| ID | Regra |
|---|---|
| RN01 | Somente eventos ativos e futuros aceitam novas inscrições. |
| RN02 | Um usuário não pode manter mais de uma inscrição ou entrada na lista de espera para o mesmo evento. |
| RN03 | Quando houver vagas, a inscrição confirmada consome uma vaga; quando não houver, a solicitação deve seguir o fluxo de lista de espera sem reduzir vagas. |
| RN04 | Cancelar uma inscrição válida libera uma vaga uma única vez. |
| RN05 | Somente o organizador do evento ou um administrador pode alterar, excluir ou consultar a lista de participantes desse evento. |
| RN06 | Um evento com inscrições confirmadas não pode ser excluído. |
| RN07 | Somente participantes com presença confirmada podem avaliar; cada participante pode avaliar cada evento uma única vez, com nota de 1 a 5. |
| RN08 | Categorias e locais referenciados por eventos não podem ser excluídos. |

## 7. Especificação das operações CRUD

Todas as rotas usam o prefixo `/api`. Respostas de criação devem usar HTTP 201; consultas e atualizações bem-sucedidas, HTTP 200. Erros de validação, autenticação, autorização, ausência de recurso e conflito devem usar, respectivamente, 400, 401, 403, 404 e 409 quando aplicável.

| Recurso / operação | Método e rota | Acesso | Resultado esperado |
|---|---|---|---|
| Usuário — cadastro | `POST /auth/register` | Público | Cria conta; valida nome, e-mail e senha; e-mail duplicado é conflito. |
| Usuário — sessão | `POST /auth/login`, `GET /auth/me` | Login público; perfil autenticado | Emite token ou retorna o perfil autenticado. |
| Usuário — listar / consultar | `GET /usuarios`, `GET /usuarios/:id` | Listagem: administrador/organizador; detalhe: autenticado | Retorna dados sem senha e com paginação na listagem. |
| Usuário — atualizar / excluir | `PUT /usuarios/:id`, `DELETE /usuarios/:id` | Próprio usuário ou administrador | Atualiza dados permitidos ou remove a conta, respeitando relações e permissões. |
| Categoria — listar / consultar | `GET /categorias`, `GET /categorias/:id` | Público | Permite filtro por `ativo` e paginação na listagem. |
| Categoria — criar / atualizar / excluir | `POST /categorias`, `PUT /categorias/:id`, `DELETE /categorias/:id` | Criar/atualizar: organizador/administrador; excluir: administrador | Persiste dados válidos; não exclui categoria com eventos vinculados. |
| Local — listar / consultar | `GET /locais`, `GET /locais/:id` | Público | Permite filtro por `ativo` e `tipo`, além de paginação. |
| Local — criar / atualizar / excluir | `POST /locais`, `PUT /locais/:id`, `DELETE /locais/:id` | Criar/atualizar: organizador/administrador; excluir: administrador | Persiste dados válidos; não exclui local com eventos vinculados. |
| Evento — listar / consultar | `GET /eventos`, `GET /eventos/:id` | Público | Lista com filtros `categoria`, `local`, `data`, `q`, `status`, `page` e `limit`, ou detalha um evento. |
| Evento — criar / atualizar / excluir | `POST /eventos`, `PUT /eventos/:id`, `DELETE /eventos/:id` | Organizador dono do evento ou administrador; criação para organizador/administrador | Cria evento futuro, mantém vagas consistentes e impede exclusão com inscrições confirmadas. |
| Evento — meus eventos | `GET /eventos/minhas` | Organizador/administrador | Retorna eventos do organizador autenticado, paginados. |
| Inscrição — criar / consultar | `POST /inscricoes`, `GET /inscricoes/minhas`, `GET /inscricoes/evento/:id` | Criar e próprias: participante autenticado; lista do evento: organizador dono ou administrador | Confirma inscrição com vaga, encaminha evento lotado à lista de espera e restringe a consulta por permissão. |
| Inscrição — cancelar / check-in | `PATCH /inscricoes/:id/cancelar`, `PATCH /inscricoes/:id/checkin` | Cancelar: titular ou administrador; check-in: organizador do evento ou administrador | Atualiza status e registra a alteração das vagas ou a presença. |
| Avaliação — criar | `POST /avaliacoes` | Participante autenticado com presença confirmada | Valida nota de 1 a 5, presença e unicidade. |
| Avaliação — consultar | `GET /avaliacoes/evento/:id`, `GET /avaliacoes/:id` | Público | Retorna avaliações e média do evento ou os dados de uma avaliação específica. |
| Avaliação — atualizar / excluir | `PUT /avaliacoes/:id`, `DELETE /avaliacoes/:id` | Autor da avaliação ou administrador | Atualiza somente nota e comentário ou remove o registro; usuário sem permissão recebe 403. |

### Campos principais dos formulários

- **Usuário:** `nome` (mínimo 3 caracteres), `email` válido, `senha` (mínimo 6 caracteres no cadastro), `telefone` opcional.
- **Categoria:** `nome` (mínimo 3 caracteres), `descricao` opcional, `cor`, `icone` e `ativo`.
- **Local:** `nome`, `endereco`, `cidade` (mínimo 3 caracteres), `cep` (mínimo 5 caracteres), `capacidade` positiva opcional, `tipo` e `ativo`.
- **Evento:** `titulo` e `descricao` (mínimo 3 caracteres), `dataHora` futura, `duracaoMin` positiva, `vagasTotal` positiva, `preco` não negativo, `categoriaId`, `localId` e `imagemUrl` opcional.
- **Inscrição:** `eventoId`; usuário é obtido do token, não do corpo da requisição.
- **Avaliação:** `eventoId`, `nota` inteira de 1 a 5 e `comentario` opcional; usuário é obtido do token.

## 8. Histórias e cenários de aceite

### Inscrição em evento com vaga

**Como** participante, **quero** me inscrever em um evento disponível, **para** garantir minha participação.

- **Dado** um evento ativo e futuro com vaga disponível, **quando** envio uma inscrição autenticada, **então** recebo confirmação, a inscrição é persistida e as vagas disponíveis diminuem em uma unidade.
- **Dado** que já tenho inscrição para o evento, **quando** tento me inscrever novamente, **então** a API rejeita a duplicidade e não altera as vagas.

### Evento lotado

**Como** participante, **quero** entrar na lista de espera de um evento lotado, **para** poder participar se surgir uma vaga.

- **Dado** um evento ativo e futuro sem vagas, **quando** solicito inscrição, **então** a API informa que fui encaminhado à lista de espera, sem criar inscrição confirmada nem alterar as vagas.

### Cancelamento e check-in

**Como** participante, **quero** cancelar minha inscrição quando não puder comparecer, **para** liberar a vaga.

- **Dada** uma inscrição confirmada minha, **quando** solicito cancelamento, **então** seu estado muda para cancelado e a vaga é liberada uma única vez.
- **Dada** uma inscrição de um evento que organizo, **quando** registro o check-in, **então** a presença e a data do check-in ficam registradas.

### Avaliação

**Como** participante presente, **quero** avaliar o evento, **para** compartilhar minha experiência com a comunidade.

- **Dada** uma inscrição com presença confirmada, **quando** envio nota de 1 a 5, **então** a avaliação é registrada e incluída na média.
- **Dado** um participante sem presença confirmada ou uma avaliação já existente, **quando** tenta avaliar, **então** a API rejeita a operação e não cria outro registro.
- **Dada** uma avaliação já registrada, **quando** o autor ou administrador atualiza nota e comentário, **então** os novos dados são persistidos; outro usuário recebe 403.
- **Dada** uma avaliação existente, **quando** o autor ou administrador a exclui, **então** ela deixa de aparecer na consulta individual e na média do evento.

## 9. Rastreabilidade inicial

| Requisito / regra | Implementação principal | Testes relacionados |
|---|---|---|
| RF01–RF02 | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` | T01–T04 |
| RF03–RF04 | `GET /api/eventos`, `GET /api/eventos/:id` | T10, T14–T15 |
| RF05–RF07 / RN05–RN06 | `POST`, `PUT`, `DELETE /api/eventos` | T05–T06 |
| RF08–RF09 / RN08 | Rotas `/api/categorias` e `/api/locais` | Adicionar casos para CRUD e exclusão com vínculo |
| RF10–RF13 / RN01–RN04 | Rotas `/api/inscricoes` | T07–T09, T11, T17 |
| RF14–RF15 / RN07 | `PATCH /api/inscricoes/:id/checkin`, `POST /api/avaliacoes` | T12–T13 |
| RF16–RF18 | `GET /api/avaliacoes/evento/:id`, `GET /api/avaliacoes/:id`, `PUT /api/avaliacoes/:id`, `DELETE /api/avaliacoes/:id` | T18–T22 |

Os casos T01–T17 estão descritos em [TEST_CASES.md](./TEST_CASES.md). A situação de cada requisito deve ser atualizada pelo grupo para **planejado**, **em desenvolvimento**, **implementado**, **validado** ou **fora do escopo aprovado**, anexando evidência de teste ou justificativa.

## 10. Pontos de validação antes de marcar como implementado

Esta ERS define critérios de aceite; a existência de uma rota, por si só, não comprova que todos foram atendidos. Ao comparar a especificação com o código atual, validar especialmente:

- A API registra a entrada na lista de espera sem permitir duplicidade e sem duplicar inscrições existentes.
- O cancelamento não libera vaga mais de uma vez nem cancela inscrição já encerrada por presença.
- A edição e exclusão de avaliação permitem somente o autor ou administrador e não permitem alterar evento ou autor vinculados.
- A consulta de um usuário por ID aplica a autorização prevista para dados pessoais.
- As rotas de atualização retornam 404 para IDs inexistentes e distinguem erro de validação de falha interna.
- Operações que alteram inscrição e vagas mantêm consistência mesmo diante de requisições simultâneas.

