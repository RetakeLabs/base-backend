import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";
import { ErroDeValidacao } from "../erros/app-error.js";

// Validação de schema na borda de toda rota, antes do controller tocar o
// body — o mesmo schema Zod funciona como allowlist de campo editável
// (Mass Assignment) e como forma validada de entrada.
export function validarSchema(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const resultado = schema.safeParse({
      body: req.body as unknown,
      query: req.query,
      params: req.params,
    });

    if (!resultado.success) {
      return next(new ErroDeValidacao("Dado inválido", resultado.error.flatten()));
    }

    req.body = (resultado.data as { body: unknown }).body;
    next();
  };
}
