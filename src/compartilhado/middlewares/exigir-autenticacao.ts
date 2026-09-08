import type { NextFunction, Request, Response } from "express";
import { NaoAutenticadoError } from "../erros/app-error.js";
import type { GeradorDeToken } from "../seguranca/gerador-de-token.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuarioAutenticado?: { id: string };
    }
  }
}

const PREFIXO_BEARER = "Bearer ";

// Popula `req.usuarioAutenticado` a partir do access token no header
// Authorization — qualquer módulo pode proteger uma rota com este factory,
// sem depender de detalhe de JWT (recebe a porta, não a lib concreta).
export function exigirAutenticacao(geradorDeToken: GeradorDeToken) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const cabecalho = req.headers.authorization;
    if (!cabecalho?.startsWith(PREFIXO_BEARER)) {
      next(new NaoAutenticadoError());
      return;
    }

    const token = cabecalho.slice(PREFIXO_BEARER.length);

    try {
      const payload = await geradorDeToken.verificarAccessToken(token);
      req.usuarioAutenticado = { id: payload.usuarioId };
      next();
    } catch {
      next(new NaoAutenticadoError("Token inválido ou expirado"));
    }
  };
}
