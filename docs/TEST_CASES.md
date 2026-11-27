# Matriz de Testes - Esporte e Comunidade

| ID | Ação | Resultado Esperado | Status |
|----|------|-------------------|--------|
| T01 | Cadastrar usuário com dados válidos | 201, usuário persistido com senha hash | Planejado |
| T02 | Cadastrar usuário com email duplicado | 409, erro claro | Planejado |
| T03 | Login com credenciais válidas | 200, retorna JWT | Planejado |
| T04 | Login com senha incorreta | 401, credenciais inválidas | Planejado |
| T05 | Criar evento com data no passado | 400 (RN07) | Planejado |
| T06 | Criar evento como participante (não organizador) | 403 (RN03) | Planejado |
| T07 | Inscrever em evento com vagas disponíveis | 201, vaga decrementada | Planejado |
| T08 | Inscrever duplicado no mesmo evento | 409 (RN02) | Planejado |
| T09 | Inscrever em evento lotado | 202, entra na lista de espera (RN01) | Planejado |
| T10 | Buscar evento ID inexistente | 404 | Planejado |
| T11 | Cancelar inscrição | 200, vaga liberada (RN04) | Planejado |
| T12 | Avaliar evento sem check-in | 403 (RN05) | Planejado |
| T13 | Avaliar com nota fora de 1-5 | 400 (RN06) | Planejado |
| T14 | Listar eventos com paginação | 200, dados paginados | Planejado |
| T15 | Filtrar eventos por categoria | 200, apenas eventos da categoria | Planejado |
| T16 | Enviar campos obrigatórios vazios | 400, erro de validação (Zod) | Planejado |
| T17 | Persistência: verificar inscrição no banco | 200, dados consistentes | Planejado |

## Fluxos de Negócio Testados

1. **Inscrição com controle de vagas**: Verifica vaga disponível, impede duplicata, gerencia lista de espera
2. **Check-in e avaliação**: Apenas participantes presentes podem avaliar, organizador faz check-in
3. **Autorização por papel**: Organizador edita/exclui apenas seus eventos, admin tem acesso total