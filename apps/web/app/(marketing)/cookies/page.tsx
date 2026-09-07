import { LegalPage } from "@/components/legal-page";
import { marketingMetadata } from "@/lib/site";

export const metadata = marketingMetadata({
  title: "Cookies",
  description: "Cookies necessários para autenticação e segurança no Backlog Syntax.",
  path: "/cookies",
});

const sections = [
  {
    heading: "O site usa cookies hoje?",
    content: (
      <p>
        Este site institucional não define cookies de analytics, publicidade ou preferências. A
        página é renderizada no servidor e funciona sem consentimento para rastreamento porque esse
        rastreamento não foi implementado.
      </p>
    ),
  },
  {
    heading: "Como funciona o cookie de sessão?",
    content: (
      <p>
        O login usa o cookie necessário <code>__Host-backlog_session</code>, com
        <code> Secure</code>, <code>HttpOnly</code>, <code>SameSite=Lax</code> e<code> Path=/</code>
        , restrito ao host da API, sem atributo <code>Domain</code>. Ele mantém sua sessão até
        expiração ou revogação e não é usado para publicidade. A Cloudflare também pode definir
        cookies estritamente necessários à proteção contra abuso.
      </p>
    ),
  },
  {
    heading: "Quando haverá banner de consentimento?",
    content: (
      <p>
        Um banner só será adicionado se uma finalidade opcional exigir consentimento. Analytics
        opcional permanecerá desligado até existir escolha prévia, registro da decisão e forma
        equivalente de revogação. Não haverá banner cenográfico para cookies que não existem.
      </p>
    ),
  },
] as const;

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookies"
      description="Não usamos cookies de analytics ou publicidade. O login e a proteção do serviço usam apenas os recursos necessários."
      path="/cookies"
      sections={sections}
    />
  );
}
