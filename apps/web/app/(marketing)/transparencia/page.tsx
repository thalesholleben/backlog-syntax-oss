import { LegalPage } from "@/components/legal-page";
import { marketingMetadata } from "@/lib/site";

export const metadata = marketingMetadata({
  title: "Transparência",
  description: "Estado, limites e decisões abertas do Backlog Syntax.",
  path: "/transparencia",
});

const sections = [
  {
    heading: "O produto já está disponível?",
    content: (
      <p>
        Sim, em backlog.syntaxlab.com.br. A primeira versão hospedada é gratuita, com web, API e
        PostgreSQL isolados na infraestrutura da Syntax Lab. O serviço está em evolução e não
        oferece SLA de disponibilidade.
      </p>
    ),
  },
  {
    heading: "O que está disponível e quais são os limites?",
    content: (
      <>
        <p>Na versão hospedada:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>cadastro, login com senha e onboarding de workspace/projeto;</li>
          <li>agenda semanal de tasks, API REST, MCP e documentação pública;</li>
          <li>
            quadro com arrasta-e-solta acessível, busca, filtro por responsável e por projeto,
            distribuição por status, gráfico de envelhecimento, card sanfona e ficha completa com
            claim/handoff;
          </li>
          <li>
            configurações de workspace, service accounts/tokens e direitos LGPD (export/exclusão);
          </li>
          <li>adaptador WebMCP como extensão progressiva do quadro.</li>
        </ul>
        <p>Ainda não existe ou não está ativo em produção:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>credenciais Google e adaptador de e-mail transacional;</li>
          <li>recuperação automática de senha por e-mail e monitoramento humano 24 horas;</li>
          <li>analytics, cobrança e upload de anexos.</li>
        </ul>
      </>
    ),
  },
  {
    heading: "Quais decisões continuam abertas?",
    content: (
      <p>
        Login Google e e-mail transacional dependem de configuração futura. Hospedagem e banco ficam
        em São Paulo, na Hostinger, com proteção da Cloudflare. A VPS tem backup semanal automático;
        cópias do banco são feitas no lançamento e em manutenções, na VPS e no Google Drive. Não há
        backup diário automático do banco. Suporte e privacidade usam contato@syntaxlab.com.br.
        Mantenha uma exportação dos dados importantes; o roadmap não é uma promessa de
        funcionalidade ou prazo.
      </p>
    ),
  },
  {
    heading: "Como a autoria é tratada?",
    content: (
      <p>
        Thales Gomes, usuário <code>thalesholleben</code>, é o autor público do projeto. Ferramentas
        de automação participam do processo de desenvolvimento, mas não recebem crédito de autoria
        ou copropriedade.
      </p>
    ),
  },
] as const;

export default function TransparencyPage() {
  return (
    <LegalPage
      title="Transparência"
      description="O que está disponível no serviço, quais recursos continuam desligados e os limites desta primeira versão."
      path="/transparencia"
      sections={sections}
    />
  );
}
