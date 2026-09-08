import { jwtVerify, SignJWT } from "jose";
import { NaoAutenticadoError } from "../erros/app-error.js";
import type { GeradorDeToken, PayloadDoToken } from "./gerador-de-token.js";

const ALGORITMO = "HS256";

// Access token de vida curta (seguranca-appsec-lgpd §1) — 15 min é o teto
// recomendado; expirado, o cliente troca pelo refresh token via
// POST /sessoes/atualizacao.
const DURACAO_ACCESS_TOKEN = "15m";

export class JoseGeradorDeToken implements GeradorDeToken {
  private readonly chave: Uint8Array;

  constructor(segredo: string) {
    this.chave = new TextEncoder().encode(segredo);
  }

  async gerarAccessToken(payload: PayloadDoToken): Promise<string> {
    return new SignJWT({ usuarioId: payload.usuarioId })
      .setProtectedHeader({ alg: ALGORITMO })
      .setIssuedAt()
      .setExpirationTime(DURACAO_ACCESS_TOKEN)
      .sign(this.chave);
  }

  async verificarAccessToken(token: string): Promise<PayloadDoToken> {
    // `algorithms` explícito — nunca aceitar o alg vindo do header sem
    // whitelist (JWT Algorithm Confusion, seguranca-appsec-lgpd §1).
    const { payload } = await jwtVerify(token, this.chave, { algorithms: [ALGORITMO] });

    if (typeof payload["usuarioId"] !== "string") {
      throw new NaoAutenticadoError("Token malformado");
    }

    return { usuarioId: payload["usuarioId"] };
  }
}
