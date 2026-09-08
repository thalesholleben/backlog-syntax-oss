// Public page copy stays out of the client JavaScript bundle.
import { english as shared } from "./messages";
export const english = {
  ...shared,
  ...{
    "Confirmar termos": "Accept terms",
    "Cookies necessários para autenticação e segurança no Backlog Syntax.":
      "Cookies required for authentication and security in Backlog Syntax.",
    "O site usa cookies hoje?": "Does the site use cookies?",
    "Este site institucional não define cookies de analytics, publicidade ou preferências. A página é renderizada no servidor e funciona sem consentimento para rastreamento porque esse rastreamento não foi implementado.":
      "This public site does not set analytics, advertising or preference cookies. Pages are rendered on the server and work without tracking consent because no tracking has been implemented.",
    "Como funciona o cookie de sessão?": "How does the session cookie work?",
    "O login usa o cookie necessário": "Sign-in uses the necessary cookie",
    ", com": ", with",
    ", restrito ao host da API, sem atributo": ", restricted to the API host, without a",
    ". Ele mantém sua sessão até expiração ou revogação e não é usado para publicidade. A Cloudflare também pode definir cookies estritamente necessários à proteção contra abuso.":
      "attribute. It maintains your session until expiration or revocation and is not used for advertising. Cloudflare may also set cookies strictly necessary for abuse prevention.",
    "Quando haverá banner de consentimento?": "When will a consent banner be added?",
    "Um banner só será adicionado se uma finalidade opcional exigir consentimento. Analytics opcional permanecerá desligado até existir escolha prévia, registro da decisão e forma equivalente de revogação. Não haverá banner cenográfico para cookies que não existem.":
      "A banner will only be added if an optional purpose requires consent. Optional analytics will remain disabled until users can choose in advance, their decision can be recorded and they can withdraw consent just as easily. There will be no decorative banner for cookies that do not exist.",
    "Não usamos cookies de analytics ou publicidade. O login e a proteção do serviço usam apenas os recursos necessários.":
      "We do not use analytics or advertising cookies. Sign-in and service protection use only necessary resources.",
    "Documentação pública do Backlog Syntax para integrar agentes e automações pela API REST, MCP remoto e WebMCP progressivo.":
      "Connect AI agents to Backlog Syntax with the REST API, remote MCP and optional WebMCP. Learn authentication, task claims and concurrency control.",
    "Documentação de API, MCP e WebMCP": "REST API and MCP integration guide",
    "Backlog open source para pessoas e agentes de IA": "Open-source task management for AI agents",
    "Backlog multi-tenant e open source onde o agente de IA tem identidade própria, assume tarefa com prazo e deixa trilha. Mesmo domínio por interface, REST e MCP.":
      "An open-source task board for people and AI agents. Coordinate work with REST and MCP, expiring claims, audit events and PostgreSQL tenant isolation.",
    "Ler o repositório inteiro e propor um plano.": "Read an entire repository and propose a plan.",
    "Escrever o código, rodar o teste e abrir o PR.":
      "Write code, run tests and open a pull request.",
    "Trabalhar de madrugada, em paralelo, sem cansar.":
      "Work overnight, in parallel, without getting tired.",
    "Repetir a tarefa chata cem vezes sem reclamar.":
      "Repeat a tedious task a hundred times without complaint.",
    "Quem estava com a tarefa quando ela travou.": "Who owned the task when it got stuck.",
    "Por que aquele caminho foi descartado.": "Why a particular approach was rejected.",
    "Qual evidência sustentou a decisão.": "Which evidence supported the decision.",
    "O que já foi tentado e não funcionou.": "What has already been tried and failed.",
    "Você roda mais de um agente ao mesmo tempo, não só um chat aberto.":
      "You run several agents at once, beyond a single chat window.",
    "O trabalho do agente precisa ser auditável depois, não só entregue.":
      "Agent work needs to be auditable after delivery.",
    "Mais de uma pessoa e mais de um projeto dividem o mesmo quadro.":
      "Several people and projects share the same board.",
    "Você prefere um contrato versionado a um clique numa integração fechada.":
      "You prefer a versioned API contract to a closed integration.",
    "Você quer poder levar o banco embora no dia que decidir sair.":
      "You want to take your data with you when you decide to leave.",
    "Chat não é estado": "Chat does not preserve task state",
    "A conversa termina e a decisão que ela produziu não fica em nenhum lugar que outro agente consiga ler amanhã. Na semana seguinte alguém refaz a mesma análise.":
      "The conversation ends, and its decisions are not stored anywhere another agent can read tomorrow. Someone repeats the same analysis the following week.",
    "Dois agentes na mesma tarefa": "Two agents on the same task",
    "Sem alguém dono da tarefa por um tempo definido, dois processos mexem no mesmo arquivo e o último a escrever ganha. O trabalho do outro some sem aviso.":
      "Without time-limited ownership, two processes can edit the same file and the last write wins. The other process loses its work without warning.",
    "O agente que assume e para": "The agent that claims a task and stops",
    "Quem pega a tarefa e morre no meio deixa ela presa. Sem prazo no claim, ninguém sabe se aquilo está andando ou abandonado desde terça.":
      "An agent that stops halfway through can leave a task locked. Without an expiring claim, nobody knows whether work is progressing or has been abandoned since Tuesday.",
    "Trilha que não existe": "Missing audit trail",
    "Quando alguém pergunta por que foi feito assim, a resposta está num histórico de conversa que ninguém guardou. A resposta vira opinião.":
      "When someone asks why a decision was made, the answer lives in a conversation nobody saved. What should be evidence becomes opinion.",
    "Fronteira que só existe no código": "Isolation that exists only in application code",
    "Multi-tenant sem isolamento no banco está a uma consulta mal escrita do vazamento. A regra precisa valer mesmo quando o código erra.":
      "A multi-tenant app without database isolation is one incorrect query away from a leak. The boundary must hold even when application code makes a mistake.",
    "Integração que é raspagem de tela": "Integrations built on screen scraping",
    "Colocar o agente para clicar na sua interface funciona até a primeira mudança de layout. Depois quebra em silêncio, e ninguém percebe na hora.":
      "Having an agent click through your interface works until the layout changes. Then the integration breaks silently, and nobody notices right away.",
    Identidade: "Identity",
    "Agente não é usuário disfarçado. É uma conta de serviço com escopo próprio, presa a um workspace, sem privilégio de administrador e com token que nunca vira sessão de navegador.":
      "An agent has its own service account, scopes and workspace boundary. It has no administrator privilege, and its token never becomes a browser session.",
    Concorrência: "Concurrency",
    "Quem assume uma tarefa assume por um tempo. O lease expira sozinho, a tarefa volta a ser de todos, e a versão da tarefa impede que alguém escreva por cima de uma leitura velha.":
      "Task ownership expires. When a lease ends, the task becomes available again. Task versions prevent someone from overwriting changes based on a stale read.",
    Superfície: "Access",
    "Um caso de uso por baixo, três formas de chegar nele. A regra de autorização não afrouxa porque a chamada veio do MCP em vez do navegador.":
      "One set of use cases, three ways to access it. Authorization rules remain the same whether a request comes from MCP or a browser.",
    "Etapa 01": "Step 01",
    "A pessoa escreve a tarefa": "A person writes the task",
    "Título, contexto e o que falta para ela avançar. A tarefa nasce em aberto, sem responsável, com versão própria desde o primeiro segundo.":
      "A title, context and what needs to happen next. The task starts open and unassigned, with its own version from the beginning.",
    "Etapa 02": "Step 02",
    "O agente assume com prazo": "An agent claims it with a deadline",
    "O claim tem lease. Enquanto ele vale, ninguém mais escreve naquela tarefa. Quando expira, ela volta para a fila em vez de ficar presa para sempre.":
      "The claim carries a lease. It establishes temporary ownership, and expiration makes the task available again instead of leaving it locked indefinitely. People retain human override.",
    "Etapa 03": "Step 03",
    "O agente registra evidência": "The agent records evidence",
    "Cada passo relevante vira evento na tarefa: o que rodou, o que provou, onde empacou. Fica no banco, não na janela de contexto.":
      "Each relevant step becomes a task event: what ran, what it proved and where it got stuck. Evidence stays in the database, beyond the context window.",
    "Etapa 04": "Step 04",
    "A pessoa decide": "A person makes the decision",
    "Handoff de volta com nota, override quando precisa, e o histórico inteiro à vista. A decisão continua sendo humana, com o material na mesa.":
      "A handoff brings the work back with notes and its history. People can override when needed and make decisions with the evidence available.",
    "A API é versionada e descrita por OpenAPI. Mutação de tarefa exige Idempotency-Key, e leitura e escrita usam ETag com If-Match, então um clique duplo ou uma retentativa não duplicam efeito.":
      "The versioned API is described by OpenAPI. Task mutations require an Idempotency-Key and use ETag with If-Match for concurrency, so double clicks and retries do not duplicate effects.",
    "MCP remoto": "Remote MCP",
    "O agente entra como conta de serviço, com escopo de leitura ou escrita, nunca administrador. É o mesmo domínio da interface, com presenter próprio, não um atalho por fora das regras.":
      "Agents connect with a scoped technical identity tied to a workspace, without administrator privileges. MCP uses the same domain rules as the web interface, with its own protocol adapter.",
    "WebMCP progressivo": "Optional WebMCP",
    "No navegador com suporte, a própria página registra um punhado de ferramentas para o projeto aberto. Sem suporte, nada muda: a interface e a API continuam completas.":
      "In a supported browser, the page exposes contextual tools for the open project. The interface and REST API remain fully available in browsers without WebMCP.",
    "O Backlog Syntax é gratuito?": "Is Backlog Syntax free?",
    "Sim. A versão hospedada é gratuita. Não há plano pago, cobrança por assento nem limite de tarefa escondido atrás de upgrade. O código disponibilizado no repositório segue sua licença MIT.":
      "Yes. The hosted version is free. There is no paid plan, per-seat billing or task limit hidden behind an upgrade. The repository's source code is available under the MIT license.",
    "Preciso hospedar por conta própria?": "Do I need to self-host it?",
    "Não. Você pode criar sua conta gratuitamente em backlog.syntaxlab.com.br. Para hospedar por conta própria, o repositório documenta Docker Compose, PostgreSQL e as variáveis de ambiente. O workspace pode ser exportado em JSON.":
      "No. You can create a free account at backlog.syntaxlab.com.br. For self-hosting, the repository documents Docker Compose, PostgreSQL and environment variables. You can export a workspace as JSON.",
    "Como um agente de IA usa o backlog sem virar um usuário disfarçado?":
      "How does an AI agent use the backlog with its own identity?",
    "Como conta de serviço: identidade própria, escopo de leitura ou escrita, nunca administrador, presa a um único workspace. Ele assume a tarefa com lease em vez de acesso indefinido, e o handoff para uma pessoa fica registrado como evento, não como troca silenciosa de dono.":
      "Through a technical identity with read or write scopes, tied to one workspace and without administrator privileges. The agent claims a task with an expiring lease. Handoffs to people are recorded as events, preserving the history of ownership.",
    "O que garante que um workspace não vaza dado para outro?":
      "How are workspaces isolated from each other?",
    "Row-Level Security no PostgreSQL, verificada por uma suíte adversarial de dois tenants em leitura e escrita. A conexão da aplicação nunca usa a role dona do banco, e auth e aplicação têm pools separados.":
      "PostgreSQL Row-Level Security enforces tenant isolation, covered by adversarial two-tenant read and write tests. Application traffic never uses the database owner role, and authentication and domain access use separate connection pools.",
    "Preciso do WebMCP para usar o produto?": "Do I need WebMCP to use the product?",
    "Não. WebMCP é extensão progressiva: melhora a experiência num navegador com suporte, e sem ele a interface, o quadro e a API REST continuam funcionando por completo.":
      "No. WebMCP is an optional enhancement in supported browsers. The interface, board and REST API work fully without it.",
    "Está pronto para produção?": "Is it ready for production use?",
    "A primeira versão hospedada está disponível, com cadastro, backlog, tasks, REST e MCP. Os limites estão na página de transparência. É um serviço gratuito em evolução, sem SLA; mantenha uma cópia dos dados importantes.":
      "The first hosted version is available, with sign-up, Backlog, Tasks, REST and MCP. The transparency page describes its limits. It is a free service under active development, without an availability SLA; keep copies of important data.",
    "Qual é o endereço da versão hospedada?": "Where is the hosted version?",
    "backlog.syntaxlab.com.br. A documentação pública explica a interface, a API REST, o MCP e o suporte progressivo a WebMCP.":
      "At backlog.syntaxlab.com.br. The public documentation covers the interface, REST API, remote MCP and optional WebMCP support.",
    "Uma mão humana e uma mão robótica movem cartões no mesmo quadro de tarefas sobre uma mesa escura. Imagem editorial gerada por inteligência artificial.":
      "A human hand and a robotic hand move cards on the same task board on a dark desk. Editorial image generated with artificial intelligence.",
    "Open source · pessoas e agentes no mesmo quadro":
      "Open source · people and agents on one board",
    "Seu agente termina a tarefa.": "Open-source task management",
    "O que ele sabia some junto com a conversa.": "for people and AI agents.",
    "Quando dois agentes e três pessoas mexem no mesmo projeto, quem sabe o que está de pé agora?":
      "Backlog Syntax is a shared task board for human and AI agent teams, with a REST API and Model Context Protocol (MCP) integration.",
    "Organize o backlog e a agenda semanal no mesmo workspace. Cada agente tem identidade própria, assume tarefas com prazo e registra evidências. Tudo conectado pela interface, pela API REST e pelo MCP.":
      "Plan your backlog and weekly tasks in one workspace. Give each agent its own identity, claim tasks with an expiration time and record evidence. Use the web app, connect your tools or self-host the MIT-licensed source.",
    "Criar conta grátis": "Create a free account",
    "Abrir o quadro": "Open your board",
    "Já disponível no navegador, sem instalar nada. Versão hospedada gratuita, em evolução e sem SLA. Os limites do serviço estão na página de transparência.":
      "Available in your browser, with no installation required. The free hosted service is under active development and has no SLA. See the transparency page for current limits.",
    "O agente já sabe trabalhar.": "Your agent can already do the work.",
    "Ele só não tem onde guardar o que descobriu.": "Give it somewhere to keep what it learns.",
    "O que ele já faz sozinho": "What it already does on its own",
    "O que não fica em lugar nenhum": "What gets lost",
    "Um backlog pode estar cheio de tarefas e vazio de estado.":
      "A backlog can be full of tasks and still lose the state of the work.",
    "Princípio do projeto": "Project principle",
    "Coordenar agente é um problema de estado, não de prompt.":
      "Agent coordination needs persistent state.",
    "Para quem é": "Who it is for",
    "Feito para quem já colocou agente para trabalhar.":
      "Built for people already working with agents.",
    "Não para quem está testando um chat pela primeira vez, e não para quem quer mais um gerenciador de tarefas pessoal. Para quem já tem agente produzindo e precisa que isso vire trabalho rastreável.":
      "For builders running agents on real projects who need to turn that output into traceable work. Shared ownership, evidence and an audit trail matter once several people and agents work together.",
    "Não é para você se": "When another tool may fit better",
    "Você procura um app de lista pessoal, quer um chat com IA colado em cima do quadro, ou precisa de um SaaS com SLA assinado hoje.":
      "If you need a personal to-do list, an AI chat attached to a board or a service with a signed availability SLA today, this version may not meet your needs.",
    "Mesa de trabalho no escuro, com dois monitores desligados iluminados por trás por uma luz verde-limão e um bolo de fichas de papel desenhadas como colunas de um quadro. Imagem editorial gerada por inteligência artificial.":
      "A dark desk with two monitors backlit in lime green and paper cards arranged into board columns. Editorial image generated with artificial intelligence.",
    Diagnóstico: "Common problems",
    "Seis coisas que quebram quando o agente entra no time.":
      "Six things that break when agents join the team.",
    "Nenhuma delas se resolve com um prompt melhor. Todas aparecem no mesmo lugar: na distância entre o que o agente fez e o que o sistema consegue provar depois.":
      "These problems appear in the gap between what an agent did and what the system can prove afterward. Coordination needs a record that survives the conversation.",
    "Como pensamos": "Our approach",
    "Identidade, concorrência e superfície.": "Identity, concurrency and access.",
    "Nessa ordem.": "In that order.",
    "A maior parte das ferramentas de agente começa pelo fim: entrega a interface e trata segurança e disputa como detalhe de implementação. Aqui as duas decisões vêm antes da tela.":
      "Before adding an interface, we define who can act, what they can access and how competing writes are resolved. Those decisions shape every route into the product.",
    "A interface é a última etapa.": "The interface comes last.",
    "Um quadro bonito sobre um modelo que não sabe quem fez o quê é só um lugar novo para perder informação. Por isso o isolamento por tenant, o lease e a versão da tarefa existem antes de qualquer pixel.":
      "A board needs to know who did what. Tenant isolation, expiring leases and task versions establish that foundation before the interface is built.",
    "Ler documentação de API, MCP e WebMCP": "Read the REST API, MCP and WebMCP guide",
    "Como o trabalho anda": "How work moves forward",
    "Quatro etapas, e a decisão continua com a pessoa.": "Four steps, with people in control.",
    "Nada disso depende de um agente específico. Quem fala REST ou MCP entra no fluxo, seja Claude Code, Codex, um worker seu ou um script de madrugada.":
      "The workflow is independent of any specific agent. Connect through REST or MCP using Claude Code, Codex, your own worker or a script.",
    "Três placas escuras idênticas em pé sobre concreto, ligadas na base por três cordas verde-limão que se encontram em um único ponto no chão. Imagem editorial gerada por inteligência artificial.":
      "Three matching dark panels stand on concrete, connected by lime-green cords that meet at one point. Editorial image generated with artificial intelligence.",
    "Três superfícies": "Three ways to connect",
    "Um domínio só por baixo. Nenhuma entrada com atalho.":
      "One domain model. Consistent authorization.",
    "Pessoa e agente enxergam o mesmo backlog. Nenhuma superfície ganha um caminho que a outra não consiga auditar.":
      "People and agents work from the same backlog. Every interface follows the same authorization and auditing rules.",
    "Perguntas frequentes": "Frequently asked questions",
    "O que costuma vir antes de abrir o código.": "What to know before opening the source.",
    "Crie seu workspace e conecte seus agentes.": "Create your workspace and connect your agents.",
    "Backlog, agenda semanal e integrações REST e MCP já estão disponíveis no navegador. Crie sua conta gratuitamente e consulte a documentação para conectar seu fluxo de trabalho. Os limites desta primeira versão continuam públicos.":
      "Backlog, weekly planning, REST and MCP integrations are available in your browser. Create a free account and use the documentation to connect your workflow. The limits of this first version are public.",
    "Ver a transparência": "View service transparency",
    "Dados, finalidades, fornecedores e direitos de privacidade no Backlog Syntax.":
      "Data, purposes, providers and privacy rights in Backlog Syntax.",
    "Quem opera o serviço?": "Who operates the service?",
    "A Syntax Lab, CNPJ 61.779.209/0001-90, opera o Backlog Syntax. Thales Gomes é o responsável pelo produto e atua como encarregado pelo tratamento de dados pessoais, nos termos do art. 41 da LGPD, aceitando comunicações de titulares e da ANPD em contato@syntaxlab.com.br. A Syntax Lab decide sobre dados de conta e segurança; no conteúdo inserido em workspaces, o papel de controlador depende de quem define a finalidade de uso e inclui o responsável pelo workspace.":
      "Syntax Lab, Brazilian company registration (CNPJ) 61.779.209/0001-90, operates Backlog Syntax. Thales Gomes is responsible for the product and acts as data protection officer under article 41 of the LGPD, accepting communications from data subjects and from Brazil's National Data Protection Authority (ANPD) at contato@syntaxlab.com.br. Syntax Lab determines the purposes of account and security data processing. For content entered into workspaces, the controller role depends on who determines its purpose and includes the workspace owner.",
    "Quais dados são tratados?": "What data is processed?",
    "nome, e-mail e hash da senha para criar e autenticar a conta, além da data e versão do aceite dos termos e da ciência deste aviso;":
      "name, email address and password hash to create and authenticate the account, along with the date and version of acceptance of the terms and acknowledgment of this notice;",
    "sessão, IP e eventos de segurança associados ao login;":
      "sessions, IP addresses and security events associated with sign-in;",
    "workspaces, projetos, tarefas, comentários, evidências e histórico de atividade;":
      "workspaces, projects, tasks, comments, evidence and activity history;",
    "identidade, escopo e uso de service accounts (tokens de agente), armazenados como hash.":
      "service account identity, scope and usage, with agent tokens stored as hashes.",
    "Para que os dados são usados?": "Why is the data used?",
    "Os dados são usados para executar o serviço solicitado, autenticar usuários, isolar workspaces, prevenir abuso e atender solicitações e obrigações legais. A prestação do serviço se apoia na execução contratual; a proteção contra abuso, no legítimo interesse, com minimização de dados. Não usamos conteúdo de tarefas para publicidade, analytics ou treinamento de modelos. Ao conectar seu próprio agente, você controla o acesso concedido e deve avaliar o tratamento realizado pelo provedor desse agente.":
      "Data is used to provide the requested service, authenticate users, isolate workspaces, prevent abuse and fulfill requests and legal obligations. Service provision relies on performance of a contract; abuse prevention relies on legitimate interests with data minimization. We do not use task content for advertising, analytics or model training. When connecting your own agent, you control its permissions and should assess how that agent's provider processes data.",
    "Quais direitos já têm um caminho na interface?":
      "Which rights can I exercise through the interface?",
    "Nas configurações de privacidade você pode exportar seus dados e excluir sua conta com confirmação explícita. O único proprietário de um workspace precisa transferir a propriedade ou excluir o workspace antes. A exclusão da conta remove sua identidade e sessões, mas não apaga conteúdo compartilhado de outros participantes; referências de auditoria retidas são pseudonimizadas. Para correção, oposição ou outros direitos, escreva para contato@syntaxlab.com.br. Verificamos identidade e autorização antes de atender.":
      "Privacy settings let you export your data and delete your account with explicit confirmation. A workspace's sole owner must first transfer ownership or delete the workspace. Account deletion removes your identity and sessions but does not delete other participants' shared content; retained audit references are pseudonymized. For correction, objection or other rights, contact contato@syntaxlab.com.br. We verify identity and authorization before fulfilling requests.",
    "Quais direitos a LGPD garante?": "Which rights does the LGPD guarantee?",
    "Independentemente do que já está na interface, a LGPD garante a você, mediante requisição:":
      "Regardless of what the interface already offers, the LGPD guarantees you, upon request:",
    "confirmação da existência de tratamento e acesso aos dados;":
      "confirmation that processing exists, and access to the data;",
    "correção de dados incompletos, inexatos ou desatualizados;":
      "correction of incomplete, inaccurate or outdated data;",
    "anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade com a lei;":
      "anonymization, blocking or deletion of data that is unnecessary, excessive or processed unlawfully;",
    "portabilidade a outro fornecedor, observados os segredos comercial e industrial;":
      "portability to another provider, subject to trade and industrial secrets;",
    "eliminação dos dados tratados com base no consentimento, ressalvadas as hipóteses de guarda previstas em lei;":
      "deletion of data processed on the basis of consent, except where the law requires retention;",
    "informação sobre as entidades públicas e privadas com as quais compartilhamos dados;":
      "information about the public and private entities with which we share data;",
    "informação sobre a possibilidade de não fornecer consentimento e sobre as consequências da recusa;":
      "information about the option to withhold consent and about the consequences of refusing;",
    "revogação do consentimento;": "withdrawal of consent;",
    "oposição a tratamento fundado em legítimo interesse, quando houver descumprimento da lei.":
      "objection to processing based on legitimate interests where the law is not being complied with.",
    "Atendemos por contato@syntaxlab.com.br, com verificação de identidade. Pedidos de confirmação e acesso são respondidos em até 15 dias, conforme o art. 19 da LGPD. Se a resposta não for satisfatória, você pode peticionar contra a Syntax Lab junto à Autoridade Nacional de Proteção de Dados, nos termos do art. 18, § 1º, da LGPD, em gov.br/anpd.":
      "We respond at contato@syntaxlab.com.br after verifying your identity. Confirmation and access requests are answered within 15 days, as required by article 19 of the LGPD. If our answer does not satisfy you, you may petition against Syntax Lab before Brazil's National Data Protection Authority under article 18, paragraph 1, of the LGPD, at gov.br/anpd.",
    "Como tratamos a transferência internacional?": "How do we handle international transfers?",
    "Parte da operação trata dados fora do Brasil. A Cloudflare processa metadados de requisição, endereço IP e terminação TLS em sua rede global, e a cópia de segurança externa fica no Google Drive, cuja região não é selecionada por esta integração. O banco e a aplicação permanecem em São Paulo. Para Hostinger e Cloudflare, a transferência se apoia nas cláusulas contratuais dos acordos de tratamento de dados públicos desses fornecedores, que foram revisados. Para o Google Drive, revisamos o adendo padrão de tratamento de dados do Google, porém a cobertura contratual específica desta conta ainda não foi verificada de forma independente, e por isso não afirmamos garantia verificada para esse destino. O inventário completo de fornecedores, com função, país, dados tratados e mecanismo de transferência, é público em docs/privacy/subprocessors.md no repositório do produto.":
      "Part of the operation processes data outside Brazil. Cloudflare processes request metadata, IP addresses and TLS termination across its global network, and the offsite backup is kept in Google Drive, whose region this integration does not select. The database and the application remain in São Paulo. For Hostinger and Cloudflare, the transfer relies on the contractual clauses of those providers' public data processing agreements, which we reviewed. For Google Drive, we reviewed Google's standard data processing addendum, but contractual coverage specific to this account has not been independently verified, so we do not claim verified coverage for that destination. The full provider inventory, with function, country, data processed and transfer mechanism, is public in docs/privacy/subprocessors.md in the product repository.",
    "Versão revisada · 8 de setembro de 2026": "Revised version · September 8, 2026",
    "Retenção, operadores e transferências": "Retention, processors and transfers",
    "Aplicação e banco ficam na Hostinger, em São Paulo, Brasil. A Cloudflare entrega e protege o tráfego em sua rede global. Cópias de segurança são mantidas na VPS e no Google Drive, que pode processar dados fora do Brasil. Mantemos cópias de lançamento e de manutenção, limitadas a 14 versões por destino, além dos backups semanais automáticos da VPS na Hostinger. Não há backup diário automático do banco nesta versão; mantenha exportações dos dados importantes. Exclusões podem permanecer nas cópias até sua expiração e devem ser reconciliadas antes de uma recuperação voltar ao ar. Dados ativos permanecem enquanto necessários ao serviço; sessões expiram ou são revogadas. Não há provedor de e-mail transacional, login Google, publicidade ou analytics habilitados nesta versão. Não insira dados sensíveis ou de terceiros sem a autorização e a finalidade apropriadas.":
      "The application and database are hosted by Hostinger in São Paulo, Brazil. Cloudflare delivers and protects traffic through its global network. Backups are stored on the VPS and in Google Drive, which may process data outside Brazil. Release and maintenance copies are limited to 14 versions per destination, in addition to Hostinger's automatic weekly VPS backups. This version has no automatic daily database backup; keep exports of important data. Deleted data may remain in backups until expiration and must be reconciled before a restored service goes live. Active data is retained while needed for the service; sessions expire or are revoked. No transactional email provider, Google sign-in, advertising or analytics is enabled in this version. Do not enter sensitive or third-party data without the appropriate authorization and purpose.",
    "Como a Syntax Lab trata dados no Backlog Syntax, quais fornecedores participam e como exercer seus direitos.":
      "How Syntax Lab processes data in Backlog Syntax, which providers are involved and how to exercise your rights.",
    "Termos de uso do serviço Backlog Syntax e limites da versão gratuita.":
      "Terms for the Backlog Syntax service and limits of the free version.",
    "O que está disponível?": "What is available?",
    "A Syntax Lab disponibiliza o Backlog Syntax gratuitamente em backlog.syntaxlab.com.br para organizar workspaces, projetos e tarefas, com acesso por interface, REST e MCP. Não há plano pago nem SLA de disponibilidade nesta versão. Você é responsável pelo uso da sua conta, pelas permissões concedidas a agentes e pelo conteúdo que insere.":
      "Syntax Lab provides Backlog Syntax free of charge at backlog.syntaxlab.com.br to organize workspaces, projects and tasks through the web interface, REST and MCP. This version has no paid plan or availability SLA. You are responsible for your account, the permissions you grant to agents and the content you enter.",
    "O que a licença permite?": "What does the license allow?",
    "O uso do código segue exclusivamente o arquivo LICENSE do repositório. Estes termos não substituem, restringem ou ampliam a licença MIT. Marcas, domínios e identidade visual não são automaticamente licenciados como código.":
      "Use of the source code is governed exclusively by the repository's LICENSE file. These terms do not replace, restrict or extend the MIT license. Trademarks, domains and visual identity are not automatically licensed as source code.",
    "Quais limites se aplicam ao serviço?": "What limits apply to the service?",
    "O serviço é fornecido conforme disponível e pode receber manutenção e ajustes. Mantenha cópias dos dados importantes. Não use a plataforma para abuso, acesso indevido, conteúdo ilícito ou dados de terceiros sem autorização. Proteja suas senhas e tokens; revogue acessos que não sejam mais necessários. Contas envolvidas em abuso podem ser suspensas. O roadmap não é uma promessa comercial. Estes termos não afastam direitos previstos em lei.":
      "The service is provided as available and may undergo maintenance and changes. Keep copies of important data. Do not use the platform for abuse, unauthorized access, unlawful content or third-party data without authorization. Protect passwords and tokens, and revoke access that is no longer needed. Accounts involved in abuse may be suspended. The roadmap is not a commercial promise. These terms do not waive statutory rights.",
    "Como relatar um problema?": "How can I report a problem?",
    "Use contato@syntaxlab.com.br para suporte, privacidade ou relato privado de vulnerabilidades. Não publique senhas, tokens ou dados pessoais em issues. Pedidos de exportação e exclusão também estão disponíveis nas configurações de privacidade da conta.":
      "Contact contato@syntaxlab.com.br for support, privacy requests or private vulnerability reports. Do not publish passwords, tokens or personal data in issues. Account privacy settings also provide export and deletion options.",
    "Condições de uso da versão hospedada gratuita, responsabilidades e limites do serviço operado pela Syntax Lab.":
      "Terms for the free hosted version, user responsibilities and limits of the service operated by Syntax Lab.",
    "Estado, limites e decisões abertas do Backlog Syntax.":
      "Current status, limits and open decisions for Backlog Syntax.",
    "O produto já está disponível?": "Is the product available?",
    "Sim, em backlog.syntaxlab.com.br. A primeira versão hospedada é gratuita, com web, API e PostgreSQL isolados na infraestrutura da Syntax Lab. O serviço está em evolução e não oferece SLA de disponibilidade.":
      "Yes, at backlog.syntaxlab.com.br. The first hosted version is free, with isolated web, API and PostgreSQL services on Syntax Lab's infrastructure. The service is under active development and has no availability SLA.",
    "O que está disponível e quais são os limites?": "What is available and what are the limits?",
    "Na versão hospedada:": "The hosted version includes:",
    "cadastro, login com senha e onboarding de workspace/projeto;":
      "account registration, password sign-in and workspace/project onboarding;",
    "agenda semanal de tasks, API REST, MCP e documentação pública;":
      "weekly task planning, REST API, MCP and public documentation;",
    "quadro com arrasta-e-solta acessível, busca, filtro por responsável e por projeto, distribuição por status, gráfico de envelhecimento, card sanfona e ficha completa com claim/handoff;":
      "a board with accessible drag and drop, search, owner and project filters, status counts, task aging charts, expandable cards and full task details with claims and handoffs;",
    "configurações de workspace, service accounts/tokens e direitos LGPD (export/exclusão);":
      "workspace settings, service accounts/tokens and LGPD privacy rights (export/deletion);",
    "adaptador WebMCP como extensão progressiva do quadro.":
      "an optional WebMCP adapter for the board.",
    "Ainda não existe ou não está ativo em produção:":
      "Not yet available or enabled in production:",
    "credenciais Google e adaptador de e-mail transacional;":
      "Google credentials and a transactional email adapter;",
    "recuperação automática de senha por e-mail e monitoramento humano 24 horas;":
      "automatic password recovery by email and 24-hour human monitoring;",
    "analytics, cobrança e upload de anexos.": "analytics, billing and attachment uploads.",
    "Quais decisões continuam abertas?": "Which decisions remain open?",
    "Login Google e e-mail transacional dependem de configuração futura. Hospedagem e banco ficam em São Paulo, na Hostinger, com proteção da Cloudflare. A VPS tem backup semanal automático; cópias do banco são feitas no lançamento e em manutenções, na VPS e no Google Drive. Não há backup diário automático do banco. Suporte e privacidade usam contato@syntaxlab.com.br. Mantenha uma exportação dos dados importantes; o roadmap não é uma promessa de funcionalidade ou prazo.":
      "Google sign-in and transactional email require future configuration. The application and database are hosted by Hostinger in São Paulo, with Cloudflare protection. The VPS has automatic weekly backups; database copies are made at release and during maintenance, on the VPS and in Google Drive. There is no automatic daily database backup. Support and privacy requests go to contato@syntaxlab.com.br. Keep exports of important data; the roadmap is not a promise of features or delivery dates.",
    "Como a autoria é tratada?": "How is authorship handled?",
    "Thales Gomes, usuário": "Thales Gomes, username",
    ", é o autor público do projeto. Ferramentas de automação participam do processo de desenvolvimento, mas não recebem crédito de autoria ou copropriedade.":
      ", is the project's public author. Automation tools participate in development but receive no authorship credit or co-ownership.",
    "O que está disponível no serviço, quais recursos continuam desligados e os limites desta primeira versão.":
      "What is available in the service, which features remain disabled and the limits of this first version.",
    "Autorizar agente": "Authorize agent",
    "Backlog para agentes e pessoas | Backlog Syntax":
      "Tasks for people and AI agents | Backlog Syntax",
    "Pular para o conteúdo": "Skip to content",
    "Configurar workspace": "Set up workspace",
    "Não foi possível criar agora.": "We could not create it. Try again shortly.",
    "Falha ao listar tarefas": "Could not list tasks",
    "Falha ao criar tarefa": "Could not create task",
    "Falha ao mover tarefa": "Could not move task",
    "Falha ao agendar tarefa": "Could not schedule task",
    "Isolamento por padrão": "Isolation by default",
    "Cada workspace é um tenant isolado por RLS no PostgreSQL. Sua conta não vê nem toca dados de outro workspace.":
      "Each workspace is a tenant isolated by PostgreSQL RLS. Your account cannot read or change another workspace’s data.",
    "Um único backlog, versão a versão, com claim, evidência e handoff visíveis para pessoas e agentes.":
      "One backlog, version by version, with claims, evidence and handoffs visible to people and agents.",
    "Concorrência sem perder trabalho": "Concurrency without lost work",
    "Toda tarefa tem versão. Escritas com base desatualizada voltam com conflito estruturado, nunca com last-write-wins silencioso.":
      "Every task has a version. Writes based on stale data return a structured conflict instead of silently overwriting work.",
    "Override humano sempre disponível": "Human override is always available",
    "documentação pública": "public documentation",
    "Não foi possível copiar. Selecione o token e copie manualmente.":
      "Could not copy. Select the token and copy it manually.",
    "Handoff e claim de agente nunca removem a capacidade de uma pessoa assumir, revisar ou reverter a tarefa.":
      "Agent claims and handoffs never remove a person’s ability to take over, review or revert a task.",
  },
} as const;
