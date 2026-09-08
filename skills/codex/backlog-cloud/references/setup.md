# Conexão no Codex

Leia quando o usuário pedir para conectar o Backlog Syntax, ou quando precisar
explicar por que as ferramentas ainda não estão disponíveis. Os comandos abaixo
são instruções de configuração, não algo que a simples leitura da skill executa.

## MCP remoto com OAuth

Se o servidor ainda não estiver configurado e o usuário quiser a configuração
no perfil do Codex:

```bash
codex mcp add backlog-cloud --url https://backlog-api.syntaxlab.com.br/mcp
codex mcp login backlog-cloud --scopes read,write
```

O login abre o fluxo OAuth. A conta e o consentimento são do usuário.
Para consultas somente, solicite `--scopes read`. Não peça `admin` para tarefas.
O comando `add` grava a configuração do Codex, geralmente em
`~/.codex/config.toml`; ele não instala esta skill.

Quando o usuário preferir limitar a configuração ao projeto, a entrada
equivalente em `.codex/config.toml` é:

```toml
[mcp_servers.backlog-cloud]
url = "https://backlog-api.syntaxlab.com.br/mcp"
```

Mescle a tabela sem substituir outras configurações e respeite a confiança
do projeto exigida pelo cliente. Depois execute o login no contexto do projeto.
Não adicione `bearer_token_env_var = "BACKLOG_TOKEN"`: o token REST de conta
de serviço não é a autenticação desse endpoint MCP.

Use `/mcp` no Codex para conferir a conexão; recarregue a sessão se o catálogo
não atualizar. Descubra as tools reais e siga [mcp.md](mcp.md).
A skill é invocada por `$backlog-cloud <pedido>`; ela também pode ser
selecionada automaticamente quando o projeto já adotou o Backlog Syntax.

## API REST com conta de serviço

No workspace do usuário, abra **Configurações > Agentes e tokens**. Um
responsável com permissão cria a conta de serviço e emite o token com `read`
para consulta, ou `read` e `write` para manipular tarefas. O segredo aparece
uma única vez. A skill não emite nem guarda credenciais por conta própria.

O usuário disponibiliza `BACKLOG_TOKEN` no ambiente do processo que fará
as chamadas REST. Pode usar o gerenciador de segredos ou carregador de ambiente
já adotado no projeto; não suponha que o cliente carregue `.env` automaticamente.
Se usar arquivo, deve ser privado e ignorado pelo Git. Nunca pedir que o
token seja colado no chat nem colocá-lo em SKILL.md, configuração MCP ou URL.

Siga [api.md](api.md). O token de conta de serviço desta V1 é para REST.
Não use `Authorization: Bearer BACKLOG_TOKEN` no MCP, nem copie a credencial
OAuth do cliente para scripts. OAuth e REST podem representar principals
diferentes, mesmo acessando o mesmo workspace.

## Conferência inicial

Faça somente leituras: liste workspaces, selecione o destino autorizado,
obtenha contexto e liste tarefas de um projeto. Confirme o principal retornado.
Não crie uma tarefa “de teste” em workspace real para verificar conexão.

Se a identidade for viewer ou tiver apenas `read`, continue consultas e
informe a falta de permissão para escrita. 401 exige autenticação válida;
403 não se resolve repetindo. Sem workspace/projeto, o responsável cria no app.
Se houver falha de registro OAuth, não invente client ID, segredo ou URL de
callback: confira a mensagem e a configuração do provedor. REST com conta
de serviço é uma alternativa quando o usuário tiver esse acesso.

Uma conexão já configurada deve ser reutilizada. Não sobrescreva servidores
existentes nem configurações de outros projetos. Para instância própria, use
somente o endpoint e o modo de autenticação explicitamente fornecidos pelo
administrador; exemplos da hospedagem não autorizam mudar o destino.

Fonte: [MCP no Codex](https://developers.openai.com/codex/mcp).
