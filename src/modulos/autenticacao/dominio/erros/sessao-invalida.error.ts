import { AppError } from "../../../../compartilhado/erros/app-error.js";

export class SessaoInvalidaError extends AppError {
  constructor(message = "Sessão inválida ou expirada") {
    super(401, "SESSAO_INVALIDA", message);
  }
}
