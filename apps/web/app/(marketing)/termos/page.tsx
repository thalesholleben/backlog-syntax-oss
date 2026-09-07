import { LegalPage } from "@/components/legal-page";
import { marketingMetadata } from "@/lib/site";

export const metadata = marketingMetadata({
  title: "Termos de uso",
  description: "Termos de uso do serviço Backlog Syntax e limites da versão gratuita.",
  path: "/termos",
});

const sections = [
  {
    heading: "O que está disponível?",
    content: (
      <p>
        A Syntax Lab disponibiliza o Backlog Syntax gratuitamente em backlog.syntaxlab.com.br para
        organizar workspaces, projetos e tarefas, com acesso por interface, REST e MCP. Não há plano
        pago nem SLA de disponibilidade nesta versão. Você é responsável pelo uso da sua conta,
        pelas permissões concedidas a agentes e pelo conteúdo que insere.
      </p>
    ),
  },
  {
    heading: "O que a licença permite?",
    content: (
      <p>
        O uso do código segue exclusivamente o arquivo LICENSE do repositório. Estes termos não
        substituem, restringem ou ampliam a licença MIT. Marcas, domínios e identidade visual não
        são automaticamente licenciados como código.
      </p>
    ),
  },
  {
    heading: "Quais limites se aplicam ao serviço?",
    content: (
      <p>
        O serviço é fornecido conforme disponível e pode receber manutenção e ajustes. Mantenha
        cópias dos dados importantes. Não use a plataforma para abuso, acesso indevido, conteúdo
        ilícito ou dados de terceiros sem autorização. Proteja suas senhas e tokens; revogue acessos
        que não sejam mais necessários. Contas envolvidas em abuso podem ser suspensas. O roadmap
        não é uma promessa comercial. Estes termos não afastam direitos previstos em lei.
      </p>
    ),
  },
  {
    heading: "Como relatar um problema?",
    content: (
      <p>
        Use contato@syntaxlab.com.br para suporte, privacidade ou relato privado de
        vulnerabilidades. Não publique senhas, tokens ou dados pessoais em issues. Pedidos de
        exportação e exclusão também estão disponíveis nas configurações de privacidade da conta.
      </p>
    ),
  },
] as const;

export default function TermsPage() {
  return (
    <LegalPage
      title="Termos de uso"
      description="Condições de uso da versão hospedada gratuita, responsabilidades e limites do serviço operado pela Syntax Lab."
      path="/termos"
      sections={sections}
    />
  );
}
