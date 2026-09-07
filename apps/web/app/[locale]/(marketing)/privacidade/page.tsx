import { localizeMetadata } from "@/lib/i18n/metadata";
import type { Translator } from "@/lib/i18n/translate";
import { getI18n } from "@/lib/i18n/server";
import { LegalPage } from "@/components/legal-page";
import { marketingMetadata } from "@/lib/site";

export async function generateMetadata() {
  const { t, locale } = await getI18n();
  return localizeMetadata(
    marketingMetadata({
      title: t("Privacidade"),
      description: t(
        "Dados, finalidades, fornecedores e direitos de privacidade no Backlog Syntax.",
      ),
      path: "/privacidade",
    }),
    locale,
  );
}

const sections = (t: Translator) =>
  [
    {
      heading: t("Quem opera o serviço?"),
      content: (
        <p>
          {t(
            "A Syntax Lab, CNPJ 61.779.209/0001-90, opera o Backlog Syntax. Thales Gomes é o responsável pelo produto. O canal para privacidade é contato@syntaxlab.com.br. A Syntax Lab decide sobre dados de conta e segurança; no conteúdo inserido em workspaces, o papel de controlador depende de quem define a finalidade de uso e inclui o responsável pelo workspace.",
          )}
        </p>
      ),
    },
    {
      heading: t("Quais dados são tratados?"),
      content: (
        <ul className="list-disc space-y-2 pl-6">
          <li>
            {t(
              "nome, e-mail e hash da senha para criar e autenticar a conta, além da data e versão do aceite dos termos e da ciência deste aviso;",
            )}
          </li>
          <li>{t("sessão, IP e eventos de segurança associados ao login;")}</li>
          <li>
            {t("workspaces, projetos, tarefas, comentários, evidências e histórico de atividade;")}
          </li>
          <li>
            {t(
              "identidade, escopo e uso de service accounts (tokens de agente), armazenados como hash.",
            )}
          </li>
        </ul>
      ),
    },
    {
      heading: t("Para que os dados são usados?"),
      content: (
        <p>
          {t(
            "Os dados são usados para executar o serviço solicitado, autenticar usuários, isolar workspaces, prevenir abuso e atender solicitações e obrigações legais. A prestação do serviço se apoia na execução contratual; a proteção contra abuso, no legítimo interesse, com minimização de dados. Não usamos conteúdo de tarefas para publicidade, analytics ou treinamento de modelos. Ao conectar seu próprio agente, você controla o acesso concedido e deve avaliar o tratamento realizado pelo provedor desse agente.",
          )}
        </p>
      ),
    },
    {
      heading: t("Quais direitos já têm um caminho na interface?"),
      content: (
        <p>
          {t(
            "Nas configurações de privacidade você pode exportar seus dados e excluir sua conta com confirmação explícita. O único proprietário de um workspace precisa transferir a propriedade ou excluir o workspace antes. A exclusão da conta remove sua identidade e sessões, mas não apaga conteúdo compartilhado de outros participantes; referências de auditoria retidas são pseudonimizadas. Para correção, oposição ou outros direitos, escreva para contato@syntaxlab.com.br. Verificamos identidade e autorização antes de atender.",
          )}
        </p>
      ),
    },
    {
      heading: t("Retenção, operadores e transferências"),
      content: (
        <p>
          {t(
            "Aplicação e banco ficam na Hostinger, em São Paulo, Brasil. A Cloudflare entrega e protege o tráfego em sua rede global. Cópias de segurança são mantidas na VPS e no Google Drive, que pode processar dados fora do Brasil. Mantemos cópias de lançamento e de manutenção, limitadas a 14 versões por destino, além dos backups semanais automáticos da VPS na Hostinger. Não há backup diário automático do banco nesta versão; mantenha exportações dos dados importantes. Exclusões podem permanecer nas cópias até sua expiração e devem ser reconciliadas antes de uma recuperação voltar ao ar. Dados ativos permanecem enquanto necessários ao serviço; sessões expiram ou são revogadas. Não há provedor de e-mail transacional, login Google, publicidade ou analytics habilitados nesta versão. Não insira dados sensíveis ou de terceiros sem a autorização e a finalidade apropriadas.",
          )}
        </p>
      ),
    },
  ] as const;

export default async function PrivacyPage() {
  const { t } = await getI18n();

  return (
    <LegalPage
      title={t("Privacidade")}
      description={t(
        "Como a Syntax Lab trata dados no Backlog Syntax, quais fornecedores participam e como exercer seus direitos.",
      )}
      path="/privacidade"
      sections={sections(t)}
    />
  );
}
