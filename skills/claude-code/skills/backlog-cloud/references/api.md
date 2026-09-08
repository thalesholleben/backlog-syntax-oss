# API REST do Backlog Syntax

Leia ao usar REST, inclusive para operações que não existem no MCP.

- Base: `https://backlog-api.syntaxlab.com.br`.
- Contrato: [OpenAPI JSON](https://backlog-api.syntaxlab.com.br/openapi.json).
- Referência: [API interativa](https://backlog-api.syntaxlab.com.br/docs).
- Autenticação: header `Authorization: Bearer <token>`, com token de conta
  de serviço fornecido pelo usuário por variável de ambiente `BACKLOG_TOKEN`.
  Não é cookie de navegador nem token OAuth extraído do MCP.
- Use cliente HTTP com headers estruturados. Não imprima headers, dumps de
  ambiente ou token. Não envie credenciais em URL, não desabilite TLS e não
  siga redirecionamentos autenticados para outro host.
- Os exemplos usam a instalação hospedada. Outra instalação exige URL
  explicitamente configurada pelo usuário e credencial dessa instalação.

## Descoberta

`GET /v1/workspaces` lista workspaces acessíveis à identidade.
`GET /v1/workspaces/{workspaceId}/context` retorna workspace, principal e
projetos. Faça a mesma seleção e confirmação de IDs do SKILL.md.
`GET /v1/workspaces/{workspaceId}/projects` oferece listagem paginada de projetos.

Workspaces, projetos e tarefas paginam por `cursor` e `limit` (1 a 100,
padrão 20), com resposta `{data, page: {hasMore, nextCursor}}`.
Tarefas também aceitam `projectId` e `status`. Não existem busca textual,
filtro `dono` ou endpoint de contagem nesta skill; processe os itens retornados.
Eventos retornam um array, sem esse envelope.

## Operações sobre tarefas

Nos caminhos abaixo, `W` é o UUID validado do workspace e `T` é o UUID
retornado da tarefa. Não envie essas letras literalmente na URL.

| Método e caminho | Corpo JSON | Headers além de Authorization |
| --- | --- | --- |
| `GET /v1/workspaces/W/tasks` | Nenhum; filtros na query | Nenhum |
| `POST /v1/workspaces/W/tasks` | `projectId`, `title`, opcionais de criação | `Idempotency-Key`, `Content-Type` |
| `GET /v1/workspaces/W/tasks/T` | Nenhum | Nenhum |
| `PATCH /v1/workspaces/W/tasks/T` | Campos alterados diretamente | `Idempotency-Key`, `If-Match`, `Content-Type` |
| `POST /v1/workspaces/W/tasks/T/claim` | `{"leaseSeconds":1800}` | `Idempotency-Key`, `If-Match`, `Content-Type` |
| `POST /v1/workspaces/W/tasks/T/claim/extend` | `{"leaseSeconds":1800}` | `Idempotency-Key`, `If-Match`, `Content-Type` |
| `POST /v1/workspaces/W/tasks/T/claim/release` | Nenhum | `Idempotency-Key`, `If-Match` |
| `POST /v1/workspaces/W/tasks/T/handoff` | `targetSubjectType`, `targetSubjectId`, `note` | `Idempotency-Key`, `If-Match`, `Content-Type` |
| `POST /v1/workspaces/W/tasks/T/events` | `eventType`, `content` | `Idempotency-Key`, `If-Match`, `Content-Type` |
| `GET /v1/workspaces/W/tasks/T/events` | Nenhum | Nenhum |
| `DELETE /v1/workspaces/W/tasks/T` | Nenhum | `Idempotency-Key`, `If-Match` |

`Content-Type` é `application/json`. As regras de status, campos, agenda,
prioridade, eventos e leases são as mesmas do SKILL.md e de [mcp.md](mcp.md).

No REST, `workspaceId` e `taskId` ficam no caminho, a versão fica em
`If-Match`, e o PATCH recebe o patch diretamente. Não envie o envelope do MCP.

Criação e evento retornam 201. Leituras, atualização, claim, extensão e handoff
retornam 200. Liberação e DELETE retornam 204, sem JSON para desserializar.
DELETE arquiva a tarefa na implementação V1 e a retira das consultas normais;
não é conclusão, não é apagamento físico e não há restauração pública documentada.
Use somente quando o usuário pedir arquivar/excluir uma tarefa específica.

Gestão de workspace, projeto, contas de serviço e tokens é administrativa.
O token de conta de serviço não concede esses poderes. Se faltar projeto,
peça a criação no app ao responsável; não tente escalar acesso.

## Exemplos de corpo

Os UUIDs são fictícios; use IDs retornados na descoberta. As seções mostram
corpos, não chamadas a executar automaticamente.

### POST /v1/workspaces/{workspaceId}/tasks

```json
{
  "projectId":"22222222-2222-4222-8222-222222222222",
  "title":"Validar importação de pedidos",
  "description":"Falta validar o exemplo em docs/importacao.md sem perda de registros.",
  "priority":"medium"
}
```

### PATCH /v1/workspaces/{workspaceId}/tasks/{taskId}

```json
{"status":"blocked","blockedReason":"Aguardando arquivo de exemplo do responsável."}
```

Para reagendar, envie `scheduledDate`; para prazo, `dueDate`. Cada um recebe
uma data ISO ou `null` para remover. A criação aceita datas, mas não `null`.
Para concluir, envie `{"status":"done","blockedReason":null}` após a validação.

### POST /v1/workspaces/{workspaceId}/tasks/{taskId}/claim

```json
{"leaseSeconds":1800}
```

### POST /v1/workspaces/{workspaceId}/tasks/{taskId}/claim/extend

```json
{"leaseSeconds":1800}
```

### POST /v1/workspaces/{workspaceId}/tasks/{taskId}/handoff

```json
{"targetSubjectType":"user","targetSubjectId":"44444444-4444-4444-8444-444444444444","note":"Ajuste pronto; falta revisão do exemplo em docs/importacao.md."}
```

### POST /v1/workspaces/{workspaceId}/tasks/{taskId}/events

```json
{"eventType":"decision_request","content":"Confirmar qual arquivo representa o formato de produção antes de finalizar a validação."}
```

## Exemplo de leitura no PowerShell

Pressupõe `BACKLOG_TOKEN` já disponível no ambiente do processo. O comando
não cria token, não mostra seu valor e não escolhe o primeiro workspace.

```powershell
if ([string]::IsNullOrWhiteSpace($env:BACKLOG_TOKEN)) {
    throw 'Configure BACKLOG_TOKEN fora do chat antes de consultar a API.'
}
$backlogHeaders = @{ Authorization = 'Bearer ' + $env:BACKLOG_TOKEN }
$backlogRequest = @{
    Method = 'Get'
    Uri = 'https://backlog-api.syntaxlab.com.br/v1/workspaces?limit=100'
    Headers = $backlogHeaders
    MaximumRedirection = 0
    TimeoutSec = 30
}
$backlogPage = Invoke-RestMethod @backlogRequest
$backlogPage.data | Select-Object id, name, slug
$backlogPage.page
```

Se `hasMore` for verdadeiro, busque a próxima página com o cursor retornado,
codificado na query. Em outros sistemas, use o cliente HTTP disponível com os
mesmos headers, limites e validação, sem imprimir a credencial.

## Versão, idempotência e tentativas

- Leia a tarefa por GET; envie seu `ETag` em `If-Match` ou a `version`
  como string entre aspas, por exemplo `If-Match: "7"`.
- Gere uma chave nova por operação lógica, por exemplo um UUID aleatório.
  `Idempotency-Key` aceita 8 a 200 caracteres. Criação também exige a chave,
  mas não exige `If-Match`.
- Mantenha a chave, método, URL, corpo e `If-Match` originais para uma eventual
  repetição da mesma operação. Não gere a chave dentro de um loop de retry.
  Não reutilize a chave com outro payload nem entre tarefas.
- O servidor conserva a deduplicação por 24 horas na V1. Não repita uma escrita
  antiga confiando que ainda será deduplicada.
- Após timeout, releia o estado. Uma repetição necessária preserva a requisição
  original; se mudar o payload ou versão para reconciliar conflito, trata-se
  de uma nova operação, que usa nova chave.
- Ao gravar evento por REST, mantenha também o mesmo `x-request-id` nas
  tentativas da mesma operação: o servidor inclui esse identificador de
  correlação no conteúdo usado para deduplicar eventos. Gere-o antes da
  primeira chamada, junto da chave, e não o altere no retry.
- Depois de claim, extensão, release, handoff ou evento, releia a tarefa:
  a versão mudou, mesmo que a resposta não traga a tarefa atualizada.
- Não execute duas mutações simultâneas na mesma tarefa. Um claim não substitui
  a precondição de versão nem o respeito à intervenção humana.

## Falhas

Leia `application/problem+json`: `code`, `detail`, `traceId` e
`errors`, quando presentes. Não presuma que o erro fornece o snapshot atual.

| Resultado | Conduta |
| --- | --- |
| 401 / `unauthenticated` | Token ausente, expirado ou revogado; solicitar acesso correto sem pedir segredo no chat |
| 403 / `forbidden` | Escopo ou papel insuficiente; não repetir com mais privilégios por conta própria |
| 404 / `not_found` | Conferir IDs no workspace autorizado; isolamento também pode esconder recursos |
| 409 / `stale_version` | Releitura e uma reconciliação autorizada; nova versão e nova chave |
| 409 / `conflict` | Conferir claim ativo ou reutilização incorreta da chave; não insistir |
| 422 / `invalid_request` | Corrigir campos, datas, motivo, versão ou headers |
| 429 | Respeitar `Retry-After` se enviado; tentativas limitadas |
| Timeout, 5xx ou resposta ilegível | Resultado de escrita incerto; conferir antes de repetir |

Não informe “salvo” ao receber HTML de proxy/login ou só porque o pedido saiu
da máquina. Em 204, confirme ausência de corpo sem tentar fazer parse de JSON.
