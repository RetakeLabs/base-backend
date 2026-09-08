import compression from "compression";
import cors from "cors";
import type { Express } from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { ambiente } from "../../configuracao/ambiente.js";

const limitadorGlobal = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

// Limite mais agressivo para rota de autenticação/cadastro — mitiga
// credential stuffing e brute force (seguranca-appsec-lgpd §1).
export const limitadorDeAutenticacao = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "MUITAS_TENTATIVAS",
      message: "Muitas tentativas. Tente novamente mais tarde.",
    },
  },
});

// Ordem importa: o que vem antes protege o que vem depois
// (backend-arquitetura-nodejs §5) — helmet, rate limit, CORS restritivo e
// body limit explícito, sempre antes de validação/autenticação.
export function aplicarMiddlewaresDeSeguranca(app: Express) {
  app.use(helmet());
  app.use(limitadorGlobal);
  app.use(
    cors({
      origin: ambiente.CORS_ORIGENS_PERMITIDAS,
      credentials: true,
    }),
  );
  app.use(compression());
}
