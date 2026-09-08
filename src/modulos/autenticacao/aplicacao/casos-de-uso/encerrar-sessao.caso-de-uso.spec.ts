import { describe, expect, it } from "vitest";
import { SessaoRefresh } from "../../dominio/sessao-refresh.entidade.js";
import type { RepositorioDeSessoes } from "../portas/repositorio-de-sessoes.js";
import { EncerrarSessao } from "./encerrar-sessao.caso-de-uso.js";

const UM_DIA_MS = 1000 * 60 * 60 * 24;

class RepositorioDeSessoesEmMemoria implements RepositorioDeSessoes {
  sessoes: SessaoRefresh[] = [];

  criar(sessao: SessaoRefresh): Promise<void> {
    this.sessoes.push(sessao);
    return Promise.resolve();
  }

  buscarPorHashDeToken(tokenHash: string): Promise<SessaoRefresh | null> {
    return Promise.resolve(this.sessoes.find((s) => s.tokenHash === tokenHash) ?? null);
  }

  salvar(): Promise<void> {
    return Promise.resolve();
  }

  revogarFamilia(familiaId: string): Promise<void> {
    this.sessoes.forEach((s) => {
      if (s.familiaId === familiaId) s.revogar();
    });
    return Promise.resolve();
  }
}

describe("EncerrarSessao", () => {
  it("revoga a família da sessão correspondente ao token", async () => {
    const repositorio = new RepositorioDeSessoesEmMemoria();
    const sessao = SessaoRefresh.iniciar("usuario-1", "token-bruto", UM_DIA_MS);
    await repositorio.criar(sessao);

    const encerrarSessao = new EncerrarSessao(repositorio);
    await encerrarSessao.executar("token-bruto");

    expect(repositorio.sessoes[0]?.estaRevogada).toBe(true);
  });

  it("é idempotente: token inexistente não lança erro", async () => {
    const repositorio = new RepositorioDeSessoesEmMemoria();
    const encerrarSessao = new EncerrarSessao(repositorio);

    await expect(
      encerrarSessao.executar("token-que-nunca-existiu"),
    ).resolves.toBeUndefined();
  });
});
