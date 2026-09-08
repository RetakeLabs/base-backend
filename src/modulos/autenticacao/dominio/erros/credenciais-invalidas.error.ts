import { AppError } from "../../../../compartilhado/erros/app-error.js";

// Mensagem sempre genérica — nunca revela se foi o e-mail ou a senha que
// errou (mitiga User Enumeration, seguranca-appsec-lgpd §6).
export class CredenciaisInvalidasError extends AppError {
  constructor() {
    super(401, "CREDENCIAIS_INVALIDAS", "E-mail ou senha inválidos");
  }
}
