export function ForgotPasswordForm() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-[-0.03em]">Recuperar senha</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          O envio de e-mail ainda não está habilitado nesta instalação. Para não prometer uma
          mensagem que não será entregue, a recuperação está desativada até o operador configurar um
          provedor transacional.
        </p>
      </div>
      <p className="text-center text-sm text-muted">
        <a
          href="/entrar"
          className="font-semibold text-foreground underline decoration-line underline-offset-4"
        >
          Voltar para o login
        </a>
      </p>
    </div>
  );
}
