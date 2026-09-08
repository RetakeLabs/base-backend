// Hierarquia própria de erro — nunca lançar string/objeto solto
// (backend-arquitetura-nodejs §3). `isOperational` distingue erro esperado
// (usuário mandou dado inválido, recurso não existe) de bug real; só o
// segundo merece alerta de oncall.
export abstract class AppError extends Error {
  protected constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly isOperational = true,
  ) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ErroDeValidacao extends AppError {
  constructor(
    message = "Dado inválido",
    public readonly detalhes?: unknown,
  ) {
    super(422, "DADOS_INVALIDOS", message);
  }
}

export class NaoAutenticadoError extends AppError {
  constructor(message = "Não autenticado") {
    super(401, "NAO_AUTENTICADO", message);
  }
}

export class AcessoNegadoError extends AppError {
  constructor(message = "Acesso negado") {
    super(403, "ACESSO_NEGADO", message);
  }
}

export class RecursoNaoEncontradoError extends AppError {
  constructor(message = "Recurso não encontrado") {
    super(404, "RECURSO_NAO_ENCONTRADO", message);
  }
}

export class ConflitoError extends AppError {
  constructor(code: string, message: string) {
    super(409, code, message);
  }
}
