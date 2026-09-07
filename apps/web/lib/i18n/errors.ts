import type { ProblemCode } from "@backlog-syntax/contracts";
import { ApiError } from "@/lib/api/client";
import type { Translator } from "./translate";

const messages: Record<ProblemCode, string> = {
  invalid_request: "Revise os dados e tente novamente.",
  unauthenticated: "Entre novamente para continuar.",
  forbidden: "Você não tem permissão para esta ação.",
  not_found: "Este item não está disponível.",
  conflict: "Esta ação conflita com o estado atual. Atualize e tente novamente.",
  stale_version: "Essa tarefa mudou desde a última leitura. Recarregando os dados atuais.",
  rate_limited: "Muitas tentativas. Aguarde um pouco antes de tentar novamente.",
  payload_too_large: "O conteúdo excede o tamanho permitido.",
  internal_error: "Não foi possível concluir a ação agora.",
  dependency_unavailable: "O serviço está temporariamente indisponível. Tente novamente.",
  reauthentication_required: "Entre novamente para confirmar uma exclusão sensível.",
  sole_owner_workspace: "Transfira a propriedade dos workspaces em que você é o único owner.",
  invalid_confirmation: "A confirmação não corresponde aos dados da conta.",
};

/** Localize stable error codes; never translate or expose arbitrary server details. */
export function errorMessage(error: unknown, t: Translator): string {
  return t(
    error instanceof ApiError ? messages[error.code] : "Não foi possível concluir a ação agora.",
  );
}
