import { randomUUID } from "node:crypto";
import pino from "pino";
import { pinoHttp } from "pino-http";
import { ambiente, ehProducao } from "../../configuracao/ambiente.js";

export const logger = pino({
  level: ambiente.NIVEL_LOG,
  // Redação de segredo em log é regra, não exceção — seguranca-appsec-lgpd §3/§6.
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.senha",
      "*.senhaHash",
      "*.password",
    ],
    censor: "[redigido]",
  },
  // `exactOptionalPropertyTypes` proíbe `transport: undefined` explícito —
  // a chave só existe quando fora de produção.
  ...(ehProducao ? {} : { transport: { target: "pino-pretty" } }),
});

// requestId propagado por toda a requisição (Controller → Caso de Uso →
// Repositório) é o que permite correlacionar os logs de uma mesma chamada.
export const middlewareDeLogDeRequisicao = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existente = req.headers["x-request-id"];
    const id = typeof existente === "string" ? existente : randomUUID();
    res.setHeader("x-request-id", id);
    return id;
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
});
