import { localizeMetadata } from "@/lib/i18n/metadata";
import type { Translator } from "@/lib/i18n/translate";
import { getI18n } from "@/lib/i18n/server";
import { LegalPage } from "@/components/legal-page";
import { marketingMetadata } from "@/lib/site";

export async function generateMetadata() {
  const { t, locale } = await getI18n();
  return localizeMetadata(
    marketingMetadata({
      title: t("Transparência"),
      description: t("Estado, limites e decisões abertas do Backlog Syntax."),
      path: "/transparencia",
    }),
    locale,
  );
}

const sections = (t: Translator) =>
  [
    {
      heading: t("O produto já está disponível?"),
      content: (
        <p>
          {t(
            "Sim, em backlog.syntaxlab.com.br. A primeira versão hospedada é gratuita, com web, API e PostgreSQL isolados na infraestrutura da Syntax Lab. O serviço está em evolução e não oferece SLA de disponibilidade.",
          )}
        </p>
      ),
    },
    {
      heading: t("O que está disponível e quais são os limites?"),
      content: (
        <>
          <p>{t("Na versão hospedada:")}</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>{t("cadastro, login com senha e onboarding de workspace/projeto;")}</li>
            <li>{t("agenda semanal de tasks, API REST, MCP e documentação pública;")}</li>
            <li>
              {t(
                "quadro com arrasta-e-solta acessível, busca, filtro por responsável e por projeto, distribuição por status, gráfico de envelhecimento, card sanfona e ficha completa com claim/handoff;",
              )}
            </li>
            <li>
              {t(
                "configurações de workspace, service accounts/tokens e direitos LGPD (export/exclusão);",
              )}
            </li>
            <li>{t("adaptador WebMCP como extensão progressiva do quadro.")}</li>
          </ul>
          <p>{t("Ainda não existe ou não está ativo em produção:")}</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>{t("credenciais Google e adaptador de e-mail transacional;")}</li>
            <li>
              {t("recuperação automática de senha por e-mail e monitoramento humano 24 horas;")}
            </li>
            <li>{t("analytics, cobrança e upload de anexos.")}</li>
          </ul>
        </>
      ),
    },
    {
      heading: t("Quais decisões continuam abertas?"),
      content: (
        <p>
          {t(
            "Login Google e e-mail transacional dependem de configuração futura. Hospedagem e banco ficam em São Paulo, na Hostinger, com proteção da Cloudflare. A VPS tem backup semanal automático; cópias do banco são feitas no lançamento e em manutenções, na VPS e no Google Drive. Não há backup diário automático do banco. Suporte e privacidade usam contato@syntaxlab.com.br. Mantenha uma exportação dos dados importantes; o roadmap não é uma promessa de funcionalidade ou prazo.",
          )}
        </p>
      ),
    },
    {
      heading: t("Como a autoria é tratada?"),
      content: (
        <p>
          {t("Thales Gomes, usuário")} <code>thalesholleben</code>
          {t(
            ", é o autor público do projeto. Ferramentas de automação participam do processo de desenvolvimento, mas não recebem crédito de autoria ou copropriedade.",
          )}
        </p>
      ),
    },
  ] as const;

export default async function TransparencyPage() {
  const { t } = await getI18n();

  return (
    <LegalPage
      title={t("Transparência")}
      description={t(
        "O que está disponível no serviço, quais recursos continuam desligados e os limites desta primeira versão.",
      )}
      path="/transparencia"
      sections={sections(t)}
    />
  );
}
