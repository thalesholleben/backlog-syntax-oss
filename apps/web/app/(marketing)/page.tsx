import Link from "next/link";
import { RevealOnScroll } from "@/components/reveal-on-scroll";
import { absoluteUrl, marketingMetadata, site } from "@/lib/site";

// JPEG aprovado pelo usuário, preservado sem recompressão.
const heroDesktopSource = "/img/hero-cover-desktop-preview.jpg";
const heroMobileWebpSrcSet =
  "/img/hero-cover-mobile-480.webp 480w, /img/hero-cover-mobile-800.webp 800w";

export const metadata = marketingMetadata({
  title: "Backlog open source para pessoas e agentes de IA",
  description:
    "Backlog multi-tenant e open source onde o agente de IA tem identidade própria, assume tarefa com prazo e deixa trilha. Mesmo domínio por interface, REST e MCP.",
  path: "/",
});

const gapBuilt = [
  "Ler o repositório inteiro e propor um plano.",
  "Escrever o código, rodar o teste e abrir o PR.",
  "Trabalhar de madrugada, em paralelo, sem cansar.",
  "Repetir a tarefa chata cem vezes sem reclamar.",
] as const;

const gapLost = [
  "Quem estava com a tarefa quando ela travou.",
  "Por que aquele caminho foi descartado.",
  "Qual evidência sustentou a decisão.",
  "O que já foi tentado e não funcionou.",
] as const;

const fitYes = [
  "Você roda mais de um agente ao mesmo tempo, não só um chat aberto.",
  "O trabalho do agente precisa ser auditável depois, não só entregue.",
  "Mais de uma pessoa e mais de um projeto dividem o mesmo quadro.",
  "Você prefere um contrato versionado a um clique numa integração fechada.",
  "Você quer poder levar o banco embora no dia que decidir sair.",
] as const;

const pains = [
  {
    title: "Chat não é estado",
    text: "A conversa termina e a decisão que ela produziu não fica em nenhum lugar que outro agente consiga ler amanhã. Na semana seguinte alguém refaz a mesma análise.",
  },
  {
    title: "Dois agentes na mesma tarefa",
    text: "Sem alguém dono da tarefa por um tempo definido, dois processos mexem no mesmo arquivo e o último a escrever ganha. O trabalho do outro some sem aviso.",
  },
  {
    title: "O agente que assume e para",
    text: "Quem pega a tarefa e morre no meio deixa ela presa. Sem prazo no claim, ninguém sabe se aquilo está andando ou abandonado desde terça.",
  },
  {
    title: "Trilha que não existe",
    text: "Quando alguém pergunta por que foi feito assim, a resposta está num histórico de conversa que ninguém guardou. A resposta vira opinião.",
  },
  {
    title: "Fronteira que só existe no código",
    text: "Multi-tenant sem isolamento no banco está a uma consulta mal escrita do vazamento. A regra precisa valer mesmo quando o código erra.",
  },
  {
    title: "Integração que é raspagem de tela",
    text: "Colocar o agente para clicar na sua interface funciona até a primeira mudança de layout. Depois quebra em silêncio, e ninguém percebe na hora.",
  },
] as const;

const principles = [
  {
    title: "Identidade",
    text: "Agente não é usuário disfarçado. É uma conta de serviço com escopo próprio, presa a um workspace, sem privilégio de administrador e com token que nunca vira sessão de navegador.",
  },
  {
    title: "Concorrência",
    text: "Quem assume uma tarefa assume por um tempo. O lease expira sozinho, a tarefa volta a ser de todos, e a versão da tarefa impede que alguém escreva por cima de uma leitura velha.",
  },
  {
    title: "Superfície",
    text: "Um caso de uso por baixo, três formas de chegar nele. A regra de autorização não afrouxa porque a chamada veio do MCP em vez do navegador.",
  },
] as const;

const steps = [
  {
    label: "Etapa 01",
    title: "A pessoa escreve a tarefa",
    text: "Título, contexto e o que falta para ela avançar. A tarefa nasce em aberto, sem responsável, com versão própria desde o primeiro segundo.",
  },
  {
    label: "Etapa 02",
    title: "O agente assume com prazo",
    text: "O claim tem lease. Enquanto ele vale, ninguém mais escreve naquela tarefa. Quando expira, ela volta para a fila em vez de ficar presa para sempre.",
  },
  {
    label: "Etapa 03",
    title: "O agente registra evidência",
    text: "Cada passo relevante vira evento na tarefa: o que rodou, o que provou, onde empacou. Fica no banco, não na janela de contexto.",
  },
  {
    label: "Etapa 04",
    title: "A pessoa decide",
    text: "Handoff de volta com nota, override quando precisa, e o histórico inteiro à vista. A decisão continua sendo humana, com o material na mesa.",
  },
] as const;

const surfaces = [
  {
    title: "REST + OpenAPI",
    text: "A API é versionada e descrita por OpenAPI. Mutação de tarefa exige Idempotency-Key, e leitura e escrita usam ETag com If-Match, então um clique duplo ou uma retentativa não duplicam efeito.",
  },
  {
    title: "MCP remoto",
    text: "O agente entra como conta de serviço, com escopo de leitura ou escrita, nunca administrador. É o mesmo domínio da interface, com presenter próprio, não um atalho por fora das regras.",
  },
  {
    title: "WebMCP progressivo",
    text: "No navegador com suporte, a própria página registra um punhado de ferramentas para o projeto aberto. Sem suporte, nada muda: a interface e a API continuam completas.",
  },
] as const;

const faqItems = [
  {
    question: "O Backlog Syntax é gratuito?",
    answer:
      "Sim. A versão hospedada é gratuita. Não há plano pago, cobrança por assento nem limite de tarefa escondido atrás de upgrade. O código disponibilizado no repositório segue sua licença MIT.",
  },
  {
    question: "Preciso hospedar por conta própria?",
    answer:
      "Não. Você pode criar sua conta gratuitamente em backlog.syntaxlab.com.br. Para hospedar por conta própria, o repositório documenta Docker Compose, PostgreSQL e as variáveis de ambiente. O workspace pode ser exportado em JSON.",
  },
  {
    question: "Como um agente de IA usa o backlog sem virar um usuário disfarçado?",
    answer:
      "Como conta de serviço: identidade própria, escopo de leitura ou escrita, nunca administrador, presa a um único workspace. Ele assume a tarefa com lease em vez de acesso indefinido, e o handoff para uma pessoa fica registrado como evento, não como troca silenciosa de dono.",
  },
  {
    question: "O que garante que um workspace não vaza dado para outro?",
    answer:
      "Row-Level Security no PostgreSQL, verificada por uma suíte adversarial de dois tenants em leitura e escrita. A conexão da aplicação nunca usa a role dona do banco, e auth e aplicação têm pools separados.",
  },
  {
    question: "Preciso do WebMCP para usar o produto?",
    answer:
      "Não. WebMCP é extensão progressiva: melhora a experiência num navegador com suporte, e sem ele a interface, o quadro e a API REST continuam funcionando por completo.",
  },
  {
    question: "Está pronto para produção?",
    answer:
      "A primeira versão hospedada está disponível, com cadastro, backlog, tasks, REST e MCP. Os limites estão na página de transparência. É um serviço gratuito em evolução, sem SLA; mantenha uma cópia dos dados importantes.",
  },
  {
    question: "Qual é o endereço da versão hospedada?",
    answer:
      "backlog.syntaxlab.com.br. A documentação pública explica a interface, a API REST, o MCP e o suporte progressivo a WebMCP.",
  },
] as const;

export default function HomePage() {
  const organizationId = absoluteUrl("/#syntax-lab");
  const websiteId = absoluteUrl("/#website");
  const organizationSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: site.publisher.name,
        url: site.publisher.url,
        logo: absoluteUrl("/brand/syntax-lab-black.png"),
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        url: absoluteUrl("/"),
        name: site.name,
        description: site.description,
        inLanguage: "pt-BR",
        publisher: { "@id": organizationId },
      },
    ],
  };
  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: site.name,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    description: site.description,
    license: "https://opensource.org/licenses/MIT",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
    author: { "@type": "Person", name: site.author.name, url: site.author.profile },
    publisher: { "@id": organizationId },
    url: absoluteUrl("/"),
    codeRepository: site.github,
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <main id="conteudo">
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema).replace(/</g, "\\u003c")}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(softwareSchema).replace(/</g, "\\u003c")}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(faqSchema).replace(/</g, "\\u003c")}
      </script>

      {/* ----------------------------------------------------------- hero */}
      <link
        rel="preload"
        as="image"
        type="image/jpeg"
        media="(min-width: 1024px)"
        href={heroDesktopSource}
      />
      <link
        rel="preload"
        as="image"
        type="image/webp"
        media="(max-width: 1023px)"
        imageSrcSet={heroMobileWebpSrcSet}
        imageSizes="100vw"
      />
      <section className="bl-home-hero" aria-labelledby="hero-title">
        <picture>
          <source
            media="(max-width: 1023px)"
            type="image/webp"
            sizes="100vw"
            srcSet={heroMobileWebpSrcSet}
            width={800}
            height={640}
          />
          <source
            media="(max-width: 1023px)"
            type="image/jpeg"
            sizes="100vw"
            srcSet="/img/hero-cover-mobile-480.jpg 480w, /img/hero-cover-mobile-800.jpg 800w"
            width={800}
            height={640}
          />
          <img
            src={heroDesktopSource}
            width={1921}
            height={916}
            alt="Uma mão humana e uma mão robótica movem cartões no mesmo quadro de tarefas sobre uma mesa escura. Imagem editorial gerada por inteligência artificial."
            fetchPriority="high"
            decoding="async"
          />
        </picture>
        <div className="relative z-10 mx-auto max-w-6xl px-4 pb-14 pt-5 sm:px-6 sm:pb-20 sm:pt-8 lg:py-20">
          <div className="lg:max-w-[50%]">
            <p className="inline-flex rounded-full border border-line bg-surface px-3.5 py-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">
              Open source · pessoas e agentes no mesmo quadro
            </p>
            <h1
              id="hero-title"
              className="mt-6 font-display text-[clamp(2.125rem,5.44vw,3.74rem)] font-bold leading-[0.94] tracking-[-0.055em]"
            >
              Seu agente termina a tarefa.{" "}
              <em className="not-italic text-muted">O que ele sabia some junto com a conversa.</em>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-7 text-foreground sm:text-xl sm:leading-8">
              Quando dois agentes e três pessoas mexem no mesmo projeto, quem sabe o que está de pé
              agora?
            </p>
            <p className="mt-4 max-w-xl leading-7 text-muted">
              Organize o backlog e a agenda semanal no mesmo workspace. Cada agente tem identidade
              própria, assume tarefas com prazo e registra evidências. Tudo conectado pela
              interface, pela API REST e pelo MCP.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/cadastro"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-6 text-center font-bold text-accent-foreground transition-[filter,transform] hover:-translate-y-px hover:brightness-95"
              >
                Criar conta grátis
              </Link>
              <Link
                href="/entrar"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-line bg-surface px-6 text-center font-bold transition-colors hover:bg-panel"
              >
                Abrir o quadro
              </Link>
            </div>
            <p className="mt-5 max-w-lg text-sm leading-6 text-faint">
              Já disponível no navegador, sem instalar nada. Versão hospedada gratuita, em evolução
              e sem SLA. Os limites do serviço estão na página de transparência.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- a lacuna */}
      <section id="lacuna" className="bg-[#101010] text-[#f3f3f0]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <h2 className="bl-reveal max-w-4xl font-display text-[clamp(1.9rem,4.4vw,3.3rem)] font-bold leading-[1.02] tracking-[-0.045em]">
            O agente já sabe trabalhar.{" "}
            <em className="not-italic text-accent">Ele só não tem onde guardar o que descobriu.</em>
          </h2>

          <div className="mt-12 grid gap-10 md:grid-cols-2 md:gap-14">
            <div className="bl-reveal">
              <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">
                O que ele já faz sozinho
              </h3>
              <ul className="mt-5 space-y-3.5">
                {gapBuilt.map((item) => (
                  <li
                    key={item}
                    className="border-t border-white/12 pt-3.5 text-[17px] leading-7 text-white/80"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bl-reveal">
              <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
                O que não fica em lugar nenhum
              </h3>
              <ul className="mt-5 space-y-3.5">
                {gapLost.map((item) => (
                  <li
                    key={item}
                    className="border-t border-white/12 pt-3.5 text-[17px] leading-7 text-white/80"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="bl-reveal mt-14 max-w-3xl font-display text-[clamp(1.4rem,3vw,2.2rem)] font-bold leading-[1.15] tracking-[-0.035em]">
            Um backlog pode estar cheio de tarefas e vazio de estado.
          </p>
        </div>
      </section>

      {/* --------------------------------------------------- faixa de marca */}
      <section aria-label="Princípio do projeto" className="bg-accent text-accent-foreground">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-9 sm:px-6 md:flex-row md:items-baseline md:justify-between">
          <p className="font-display text-[clamp(1.2rem,2.6vw,1.9rem)] font-bold tracking-[-0.035em]">
            Coordenar agente é um problema de estado, não de prompt.
          </p>
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] opacity-70">
            REST · MCP · WebMCP
          </span>
        </div>
      </section>

      {/* -------------------------------------------------------- para quem */}
      <section id="para-quem" className="border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-14">
          <div className="bl-reveal">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-faint">
              Para quem é
            </p>
            <h2 className="mt-4 font-display text-[clamp(1.8rem,3.6vw,2.9rem)] font-bold leading-[1.05] tracking-[-0.045em]">
              Feito para quem já colocou agente para trabalhar.
            </h2>
            <p className="mt-5 max-w-lg leading-7 text-muted">
              Não para quem está testando um chat pela primeira vez, e não para quem quer mais um
              gerenciador de tarefas pessoal. Para quem já tem agente produzindo e precisa que isso
              vire trabalho rastreável.
            </p>
            <div className="mt-8 rounded-card border border-line bg-panel p-6">
              <h3 className="font-display text-lg font-bold">Não é para você se</h3>
              <p className="mt-2 leading-7 text-muted">
                Você procura um app de lista pessoal, quer um chat com IA colado em cima do quadro,
                ou precisa de um SaaS com SLA assinado hoje.
              </p>
            </div>
          </div>

          <ol className="bl-reveal grid content-start gap-px overflow-hidden rounded-card border border-line bg-line">
            {fitYes.map((item, index) => (
              <li key={item} className="flex items-start gap-4 bg-surface px-6 py-5">
                <span className="mt-0.5 font-mono text-[11px] font-bold text-faint">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="leading-7">{item}</span>
              </li>
            ))}
          </ol>
        </div>

        <picture>
          <source
            type="image/webp"
            sizes="100vw"
            srcSet="/img/mesa-640.webp 640w, /img/mesa-960.webp 960w, /img/mesa-1280.webp 1280w, /img/mesa-1536.webp 1536w"
          />
          <img
            src="/img/mesa-1280.jpg"
            sizes="100vw"
            srcSet="/img/mesa-640.jpg 640w, /img/mesa-960.jpg 960w, /img/mesa-1280.jpg 1280w, /img/mesa-1536.jpg 1536w"
            width={1536}
            height={1024}
            alt="Mesa de trabalho no escuro, com dois monitores desligados iluminados por trás por uma luz verde-limão e um bolo de fichas de papel desenhadas como colunas de um quadro. Imagem editorial gerada por inteligência artificial."
            loading="lazy"
            decoding="async"
            className="block h-[38vw] max-h-[420px] min-h-[200px] w-full object-cover"
          />
        </picture>
      </section>

      {/* ---------------------------------------------------------- travas */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="bl-reveal font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-faint">
            Diagnóstico
          </p>
          <h2 className="bl-reveal mt-4 max-w-3xl font-display text-[clamp(1.8rem,3.6vw,2.9rem)] font-bold leading-[1.05] tracking-[-0.045em]">
            Seis coisas que quebram quando o agente entra no time.
          </h2>
          <p className="bl-reveal mt-5 max-w-2xl text-lg leading-8 text-muted">
            Nenhuma delas se resolve com um prompt melhor. Todas aparecem no mesmo lugar: na
            distância entre o que o agente fez e o que o sistema consegue provar depois.
          </p>

          <ol className="mt-12 grid gap-px overflow-hidden rounded-card border border-line bg-line md:grid-cols-2 lg:grid-cols-3">
            {pains.map((pain, index) => (
              <li key={pain.title} className="bl-reveal bg-background p-6 sm:p-7">
                <p className="font-mono text-xs font-bold text-faint">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-7 font-display text-xl font-bold tracking-[-0.02em]">
                  {pain.title}
                </h3>
                <p className="mt-3 leading-7 text-muted">{pain.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* --------------------------------------------------- como pensamos */}
      <section id="arquitetura" className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="bl-reveal font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-faint">
            Como pensamos
          </p>
          <h2 className="bl-reveal mt-4 max-w-3xl font-display text-[clamp(1.8rem,3.6vw,2.9rem)] font-bold leading-[1.05] tracking-[-0.045em]">
            Identidade, concorrência e superfície. <em className="not-italic">Nessa ordem.</em>
          </h2>
          <p className="bl-reveal mt-5 max-w-2xl text-lg leading-8 text-muted">
            A maior parte das ferramentas de agente começa pelo fim: entrega a interface e trata
            segurança e disputa como detalhe de implementação. Aqui as duas decisões vêm antes da
            tela.
          </p>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {principles.map((principle, index) => (
              <article
                key={principle.title}
                className="bl-reveal rounded-card border border-line bg-surface p-6 sm:p-7"
              >
                <p className="font-mono text-xs font-bold text-faint">0{index + 1}</p>
                <h3 className="mt-7 font-display text-xl font-bold tracking-[-0.02em]">
                  {principle.title}
                </h3>
                <p className="mt-3 leading-7 text-muted">{principle.text}</p>
              </article>
            ))}
          </div>

          <div className="bl-reveal mt-10 rounded-card bg-contrast p-7 text-contrast-foreground sm:p-9">
            <strong className="font-display text-2xl font-bold tracking-[-0.03em]">
              A interface é a última etapa.
            </strong>
            <p className="mt-3 max-w-3xl leading-7 opacity-75">
              Um quadro bonito sobre um modelo que não sabe quem fez o quê é só um lugar novo para
              perder informação. Por isso o isolamento por tenant, o lease e a versão da tarefa
              existem antes de qualquer pixel.
            </p>
          </div>
          <Link
            href="/documentacao"
            className="bl-reveal mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-contrast px-6 font-bold text-contrast-foreground hover:opacity-85"
          >
            Ler documentação de API, MCP e WebMCP
          </Link>
        </div>
      </section>

      {/* -------------------------------------------------------- processo */}
      <section id="como-funciona" className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="bl-reveal font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-faint">
            Como o trabalho anda
          </p>
          <h2 className="bl-reveal mt-4 max-w-3xl font-display text-[clamp(1.8rem,3.6vw,2.9rem)] font-bold leading-[1.05] tracking-[-0.045em]">
            Quatro etapas, e a decisão continua com a pessoa.
          </h2>

          <ol className="mt-12 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <li key={step.title} className="bl-reveal bg-background p-6 sm:p-7">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-faint">
                  {step.label}
                </p>
                <h3 className="mt-6 font-display text-lg font-bold tracking-[-0.02em]">
                  {step.title}
                </h3>
                <p className="mt-3 leading-7 text-muted">{step.text}</p>
              </li>
            ))}
          </ol>

          <p className="bl-reveal mt-8 max-w-3xl leading-7 text-muted">
            Nada disso depende de um agente específico. Quem fala REST ou MCP entra no fluxo, seja
            Claude Code, Codex, um worker seu ou um script de madrugada.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------ superfícies */}
      <section id="superficies" className="border-b border-line">
        <picture>
          <source
            type="image/webp"
            sizes="100vw"
            srcSet="/img/superficies-640.webp 640w, /img/superficies-960.webp 960w, /img/superficies-1280.webp 1280w, /img/superficies-1536.webp 1536w"
          />
          <img
            src="/img/superficies-1280.jpg"
            sizes="100vw"
            srcSet="/img/superficies-640.jpg 640w, /img/superficies-960.jpg 960w, /img/superficies-1280.jpg 1280w, /img/superficies-1536.jpg 1536w"
            width={1536}
            height={1024}
            alt="Três placas escuras idênticas em pé sobre concreto, ligadas na base por três cordas verde-limão que se encontram em um único ponto no chão. Imagem editorial gerada por inteligência artificial."
            loading="lazy"
            decoding="async"
            className="block h-[38vw] max-h-[420px] min-h-[200px] w-full object-cover"
          />
        </picture>

        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="bl-reveal font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-faint">
            Três superfícies
          </p>
          <h2 className="bl-reveal mt-4 max-w-3xl font-display text-[clamp(1.8rem,3.6vw,2.9rem)] font-bold leading-[1.05] tracking-[-0.045em]">
            Um domínio só por baixo. Nenhuma entrada com atalho.
          </h2>
          <p className="bl-reveal mt-5 max-w-2xl text-lg leading-8 text-muted">
            Pessoa e agente enxergam o mesmo backlog. Nenhuma superfície ganha um caminho que a
            outra não consiga auditar.
          </p>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {surfaces.map((surface) => (
              <article
                key={surface.title}
                className="bl-reveal rounded-card border border-line bg-surface p-6 sm:p-7"
              >
                <h3 className="font-display text-xl font-bold tracking-[-0.02em]">
                  {surface.title}
                </h3>
                <p className="mt-3 leading-7 text-muted">{surface.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- perguntas */}
      <section id="perguntas" className="border-b border-line bg-surface">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="bl-reveal font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-faint">
            Perguntas frequentes
          </p>
          <h2 className="bl-reveal mt-4 max-w-2xl font-display text-[clamp(1.8rem,3.6vw,2.9rem)] font-bold leading-[1.05] tracking-[-0.045em]">
            O que costuma vir antes de abrir o código.
          </h2>

          <dl className="mt-12 space-y-7">
            {faqItems.map((item) => (
              <div key={item.question} className="bl-reveal border-t border-line pt-6">
                <dt className="font-display text-xl font-bold tracking-[-0.02em]">
                  {item.question}
                </dt>
                <dd className="mt-2.5 max-w-2xl leading-7 text-muted">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ------------------------------------------------------- fechamento */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="bl-reveal rounded-card bg-contrast p-7 text-contrast-foreground sm:p-10 lg:flex lg:items-end lg:justify-between lg:gap-10">
          <div className="max-w-2xl">
            <h2 className="font-display text-[clamp(1.8rem,3.6vw,2.9rem)] font-bold leading-[1.05] tracking-[-0.045em]">
              Crie seu workspace e conecte seus agentes.
            </h2>
            <p className="mt-4 leading-7 opacity-75">
              Backlog, agenda semanal e integrações REST e MCP já estão disponíveis no navegador.
              Crie sua conta gratuitamente e consulte a documentação para conectar seu fluxo de
              trabalho. Os limites desta primeira versão continuam públicos.
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:mt-0 lg:shrink-0">
            <Link
              href="/cadastro"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-6 font-bold text-accent-foreground hover:brightness-95"
            >
              Criar conta grátis
            </Link>
            <Link
              href="/transparencia"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-contrast-foreground/25 px-6 font-bold hover:bg-contrast-foreground/10"
            >
              Ver a transparência
            </Link>
          </div>
        </div>
      </section>

      <RevealOnScroll />
    </main>
  );
}
