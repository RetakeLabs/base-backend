import { ConflitoError } from "../../../../compartilhado/erros/app-error.js";

export class UsuarioJaExisteError extends ConflitoError {
  constructor(email: string) {
    super("USUARIO_JA_EXISTE", `Já existe um usuário cadastrado com o e-mail ${email}`);
  }
}
