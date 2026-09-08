# MCP do Backlog Syntax

Leia para operar pelo MCP conectado. Endpoint: https://backlog-api.syntaxlab.com.br/mcp,
transporte Streamable HTTP, autenticação OAuth do próprio cliente.

## Descoberta e resultados

Descubra as tools no catálogo do cliente. O nome de servidor sugerido é
`backlog-cloud`, mas instalações existentes podem usar outro nome.
Use a ferramenta que corresponde à operação; não suponha que o nome completo
será igual entre Claude Code, Codex e conectores.

O catálogo V1 tem as 11 operações abaixo. Elas exigem `read` para conexão e
leitura; as escritas exigem também `write`. Permissões do workspace continuam
valendo. `admin` não é necessário para gerenciar tarefas.

| Tool | Argumentos | Resultado |
| --- | --- | --- |
| `list_workspaces` | `cursor?`, `limit?` | `{data, page}` |
| `get_workspace_context` | `workspaceId` | `{workspace, principal, projects}` |
| `list_tasks` | `workspaceId`, `projectId?`, `status?`, `cursor?`, `limit?` | `{data, page}` |
| `get_task` | `workspaceId`, `taskId` | Tarefa com `version` e `claimedBy` |
| `create_task` | `workspaceId`, `projectId`, `title`, `description?`, `priority?`, `scheduledDate?`, `dueDate?` | Tarefa criada em `open` |
| `update_task` | `workspaceId`, `taskId`, `expectedVersion`, `patch` | Tarefa atualizada |
| `claim_task` | `workspaceId`, `taskId`, `expectedVersion`, `leaseSeconds?` | Claim |
| `extend_claim` | Mesmos argumentos de `claim_task` | Claim renovado |
| `release_claim` | `workspaceId`, `taskId`, `expectedVersion` | `{released: true}` |
| `handoff_task` | `workspaceId`, `taskId`, `expectedVersion`, `targetSubjectType`, `targetSubjectId`, `note` | Claim transferido |
| `record_task_event` | `workspaceId`, `taskId`, `eventType`, `content`, `expectedVersion?` | Evento |

`limit`: 1 a 100, padrão 20. `cursor` é opaco. Reenvie os mesmos filtros
na página seguinte. Não use paginação por `offset` ou `page`.

Prefira `structuredContent`. Quando só houver `content` textual, leia o JSON
da resposta sem tratar o aviso inicial como parte do JSON. Verifique erros do
transporte, erros JSON-RPC e `isError` antes de confirmar uma operação.

V1 não fornece tools de exclusão, gestão de projetos, listagem de membros ou
leitura de eventos, nem recursos MCP registrados para substituir essas tools.
Não invente `delete_task`, `complete_task`, `list_projects`, `search_tasks`
ou URIs de recursos. Para ler eventos ou arquivar, consulte
[api.md](api.md) se já houver acesso REST autorizado.

## Exemplos de argumentos

Os UUIDs e versões abaixo são fictícios, apenas para mostrar o formato.
Substitua por valores de respostas reais. Os exemplos não formam uma sequência
de versões; releia a tarefa entre as operações.

### list_workspaces

```json
{}
```

### get_workspace_context

```json
{"workspaceId":"11111111-1111-4111-8111-111111111111"}
```

### list_tasks

Para procurar duplicata, omita `status` e percorra todas as páginas do projeto.

```json
{"workspaceId":"11111111-1111-4111-8111-111111111111","projectId":"22222222-2222-4222-8222-222222222222","limit":100}
```

### get_task

```json
{"workspaceId":"11111111-1111-4111-8111-111111111111","taskId":"33333333-3333-4333-8333-333333333333"}
```

### create_task

```json
{
  "workspaceId":"11111111-1111-4111-8111-111111111111",
  "projectId":"22222222-2222-4222-8222-222222222222",
  "title":"Validar importação de pedidos",
  "description":"Falta validar o arquivo com colunas opcionais. Concluir quando o exemplo em docs/importacao.md passar sem perda de registros.",
  "priority":"medium"
}
```

### update_task

```json
{
  "workspaceId":"11111111-1111-4111-8111-111111111111",
  "taskId":"33333333-3333-4333-8333-333333333333",
  "expectedVersion":7,
  "patch":{"status":"blocked","blockedReason":"Aguardando arquivo de exemplo do responsável."}
}
```

O patch aceita apenas `title`, `description`, `status`, `priority`,
`blockedReason`, `scheduledDate`, `dueDate` e `position`; não pode ser vazio.
Não permite mover uma tarefa entre projetos. `position` é uma string decimal
não negativa, usada apenas quando o usuário pedir reordenação.

### claim_task

```json
{"workspaceId":"11111111-1111-4111-8111-111111111111","taskId":"33333333-3333-4333-8333-333333333333","expectedVersion":7,"leaseSeconds":1800}
```

### extend_claim

```json
{"workspaceId":"11111111-1111-4111-8111-111111111111","taskId":"33333333-3333-4333-8333-333333333333","expectedVersion":9,"leaseSeconds":1800}
```

### release_claim

```json
{"workspaceId":"11111111-1111-4111-8111-111111111111","taskId":"33333333-3333-4333-8333-333333333333","expectedVersion":12}
```

O lease vai de 60 a 86.400 segundos, padrão 1.800. Use o vencimento retornado
pelo servidor. Reservar, renovar, liberar e transferir mudam a versão da
tarefa, mas retornam claim/recibo, sem a nova `version`: faça `get_task`.
Não presuma que `claimedBy` de uma resposta de atualização comprova liberação;
confira com `get_task`.

### handoff_task

```json
{
  "workspaceId":"11111111-1111-4111-8111-111111111111",
  "taskId":"33333333-3333-4333-8333-333333333333",
  "expectedVersion":11,
  "targetSubjectType":"user",
  "targetSubjectId":"44444444-4444-4444-8444-444444444444",
  "note":"Importação ajustada. Falta revisar o exemplo em docs/importacao.md."
}
```

O destinatário deve pertencer ao workspace; `targetSubjectType` é `user`
ou `service_account`. Nota: 1 a 4.000 caracteres. O serviço transfere sua
reserva ativa e concede um novo lease de 30 minutos ao destinatário.
Handoff não muda o status nem concede acesso.

### record_task_event

```json
{
  "workspaceId":"11111111-1111-4111-8111-111111111111",
  "taskId":"33333333-3333-4333-8333-333333333333",
  "expectedVersion":10,
  "eventType":"evidence",
  "content":"Validação executada com o exemplo de docs/importacao.md; registros e campos opcionais preservados."
}
```

Tipos: `evidence`, `decision_request`, `decision`, `comment`.
Conteúdo: 1 a 20.000 caracteres. Use evidências reais.
O contrato MCP permite omitir `expectedVersion`; enviá-la valida e incrementa
a versão da tarefa. Esta skill prefere enviá-la e reler após gravar.

## Idempotência e falhas

O servidor deriva a chave de idempotência do ID JSON-RPC da chamada:
`mcp:<request-id>`. Não adicione `idempotencyKey` ao argumento de uma tool.
Uma nova invocação pelo cliente pode receber outro ID, portanto não há garantia
de que “chamar novamente” será deduplicado.

Após timeout de criação, liste e confira o resultado antes de repetir.
Após timeout de atualização/claim, releia a tarefa. Para evento incerto, consulte
o histórico pela API autorizada ou peça conferência no app. Se não conseguir
determinar o resultado, informe a incerteza e não gere outro evento às cegas.
Para automação que precisa controlar a chave explicitamente, use REST desde o
início com sua conta de serviço, sem trocar a identidade de um claim ativo.

401 exige reautenticação; 403 exige escopo/papel apropriado; 404 pode indicar
ID incorreto ou recurso invisível. Não teste outros tenants. Em 409, siga a
reconciliação do SKILL.md; em 422, corrija o payload. Para 429, respeite
`Retry-After` quando disponível. Para timeout/5xx de escrita, reconcilie antes
de tentar novamente.

Fontes: [guia do serviço](https://backlog.syntaxlab.com.br/documentacao#mcp)
e contratos `packages/contracts/src/mcp.ts`, `task.ts`, `workspace.ts` do
[repositório do produto](https://github.com/thalesholleben/backlog-syntax-oss).
O catálogo efetivamente anunciado pelo servidor conectado prevalece.
