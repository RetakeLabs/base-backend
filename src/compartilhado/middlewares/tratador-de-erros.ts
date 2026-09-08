import type { NextFunction, Request, Response } from "express";
import { AppError, ErroDeValidacao } from "../erros/app-error.js";

// Envelope único de resposta — sucesso `{ data }`, erro `{ error }` — para
// que todo consumidor escreva um parser só (backend-arquitetura-nodejs §3).
// Sempre o último `app.use`, com 4 parâmetros: é a assinatura que o Express
// usa para reconhecer um error handler, mesmo sem usar `next`.
export function tratadorDeErros(
  erro: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (erro instanceof AppError) {
    if (!erro.isOperational) {
      req.log.error({ err: erro }, "erro não operacional (bug)");
    }
    return res.status(erro.statusCode).json({
      error: {
        code: erro.code,
        message: erro.message,
        ...(erro instanceof ErroDeValidacao && erro.detalhes
          ? { details: erro.detalhes }
          : {}),
      },
    });
  }

  // Erro não mapeado é bug real: nunca vaza stack trace/query para o
  // cliente (reconnaissance de graça) — log completo fica no servidor,
  // correlacionável pelo requestId já anexado ao `req.log`.
  req.log.error({ err: erro }, "erro não tratado");
  return res.status(500).json({
    error: { code: "ERRO_INTERNO", message: "Erro interno do servidor" },
  });
}
