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
            "A Syntax Lab, CNPJ 61.779.209/0001-90, opera o Backlog Syntax. Thales Gomes é o responsável pelo produto e atua como encarregado pelo tratamento de dados pessoais, nos termos do art. 41 da LGPD, aceitando comunicações de titulares e da ANPD em contato@syntaxlab.com.br. A Syntax Lab decide sobre dados de conta e segurança; no conteúdo inserido em workspaces, o papel de controlador depende de quem define a finalidade de uso e inclui o responsável pelo workspace.",
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
      heading: t("Quais direitos a LGPD garante?"),
      content: (
        <>
          <p>
            {t(
              "Independentemente do que já está na interface, a LGPD garante a você, mediante requisição:",
            )}
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>{t("confirmação da existência de tratamento e acesso aos dados;")}</li>
            <li>{t("correção de dados incompletos, inexatos ou desatualizados;")}</li>
            <li>
              {t(
                "anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade com a lei;",
              )}
            </li>
            <li>
              {t(
                "portabilidade a outro fornecedor, observados os segredos comercial e industrial;",
              )}
            </li>
            <li>
              {t(
                "eliminação dos dados tratados com base no consentimento, ressalvadas as hipóteses de guarda previstas em lei;",
              )}
            </li>
            <li>
              {t(
                "informação sobre as entidades públicas e privadas com as quais compartilhamos dados;",
              )}
            </li>
            <li>
              {t(
                "informação sobre a possibilidade de não fornecer consentimento e sobre as consequências da recusa;",
              )}
            </li>
            <li>{t("revogação do consentimento;")}</li>
            <li>
              {t(
                "oposição a tratamento fundado em legítimo interesse, quando houver descumprimento da lei.",
              )}
            </li>
          </ul>
          <p>
            {t(
              "Atendemos por contato@syntaxlab.com.br, com verificação de identidade. Pedidos de confirmação e acesso são respondidos em até 15 dias, conforme o art. 19 da LGPD. Se a resposta não for satisfatória, você pode peticionar contra a Syntax Lab junto à Autoridade Nacional de Proteção de Dados, nos termos do art. 18, § 1º, da LGPD, em gov.br/anpd.",
            )}
          </p>
        </>
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
    {
      heading: t("Como tratamos a transferência internacional?"),
      content: (
        <p>
          {t(
            "Parte da operação trata dados fora do Brasil. A Cloudflare processa metadados de requisição, endereço IP e terminação TLS em sua rede global, e a cópia de segurança externa fica no Google Drive, cuja região não é selecionada por esta integração. O banco e a aplicação permanecem em São Paulo. Para Hostinger e Cloudflare, a transferência se apoia nas cláusulas contratuais dos acordos de tratamento de dados públicos desses fornecedores, que foram revisados. Para o Google Drive, revisamos o adendo padrão de tratamento de dados do Google, porém a cobertura contratual específica desta conta ainda não foi verificada de forma independente, e por isso não afirmamos garantia verificada para esse destino. O inventário completo de fornecedores, com função, país, dados tratados e mecanismo de transferência, é público em docs/privacy/subprocessors.md no repositório do produto.",
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
      version={t("Versão revisada · 8 de setembro de 2026")}
      sections={sections(t)}
    />
  );
}
