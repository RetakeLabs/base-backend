import { describe, expect, it } from "vitest";
import { SessaoRefresh } from "./sessao-refresh.entidade.js";

const UM_DIA_MS = 1000 * 60 * 60 * 24;

describe("SessaoRefresh", () => {
  it("gera tokens brutos únicos a cada chamada", () => {
    const a = SessaoRefresh.gerarTokenBruto();
    const b = SessaoRefresh.gerarTokenBruto();

    expect(a).not.toBe(b);
    expect(a).toHaveLength(64); // 32 bytes em hex
  });

  it("hashDoToken é determinístico para o mesmo valor de entrada", () => {
    const token = "token-de-teste";
    expect(SessaoRefresh.hashDoToken(token)).toBe(SessaoRefresh.hashDoToken(token));
  });

  it("iniciar() cria sessão nova, não revogada e não expirada", () => {
    const sessao = SessaoRefresh.iniciar("usuario-1", "token-bruto", UM_DIA_MS);

    expect(sessao.usuarioId).toBe("usuario-1");
    expect(sessao.estaRevogada).toBe(false);
    expect(sessao.estaExpirada).toBe(false);
    expect(sessao.tokenHash).toBe(SessaoRefresh.hashDoToken("token-bruto"));
  });

  it("rotacionar() preserva a familiaId da sessão anterior", () => {
    const original = SessaoRefresh.iniciar("usuario-1", "token-1", UM_DIA_MS);
    const rotacionada = SessaoRefresh.rotacionar(original, "token-2", UM_DIA_MS);

    expect(rotacionada.familiaId).toBe(original.familiaId);
    expect(rotacionada.id).not.toBe(original.id);
    expect(rotacionada.tokenHash).not.toBe(original.tokenHash);
  });

  it("revogar() marca a sessão como revogada de forma idempotente", () => {
    const sessao = SessaoRefresh.iniciar("usuario-1", "token-bruto", UM_DIA_MS);

    sessao.revogar();
    const primeiraRevogacao = sessao.paraPersistencia().revogadaEm;
    sessao.revogar();
    const segundaRevogacao = sessao.paraPersistencia().revogadaEm;

    expect(sessao.estaRevogada).toBe(true);
    expect(primeiraRevogacao).toEqual(segundaRevogacao);
  });

  it("estaExpirada reflete uma duração já vencida", () => {
    const sessao = SessaoRefresh.iniciar("usuario-1", "token-bruto", -1);
    expect(sessao.estaExpirada).toBe(true);
  });
});
