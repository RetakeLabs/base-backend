import { describe, expect, it } from "vitest";
import type {
  GeradorDeToken,
  PayloadDoToken,
} from "../../../../compartilhado/seguranca/gerador-de-token.js";
import { SessaoInvalidaError } from "../../dominio/erros/sessao-invalida.error.js";
import { SessaoRefresh } from "../../dominio/sessao-refresh.entidade.js";
import type { RepositorioDeSessoes } from "../portas/repositorio-de-sessoes.js";
import { RenovarSessao } from "./renovar-sessao.caso-de-uso.js";

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

  salvar(sessao: SessaoRefresh): Promise<void> {
    const indice = this.sessoes.findIndex((s) => s.id === sessao.id);
    if (indice !== -1) this.sessoes[indice] = sessao;
    return Promise.resolve();
  }

  revogarFamilia(familiaId: string): Promise<void> {
    this.sessoes = this.sessoes.map((s) => {
      if (s.familiaId === familiaId && !s.estaRevogada) s.revogar();
      return s;
    });
    return Promise.resolve();
  }
}

class GeradorDeTokenFalso implements GeradorDeToken {
  gerarAccessToken(payload: PayloadDoToken): Promise<string> {
    return Promise.resolve(`access(${payload.usuarioId})`);
  }
  verificarAccessToken(token: string): Promise<PayloadDoToken> {
    return Promise.resolve({ usuarioId: token });
  }
}

describe("RenovarSessao", () => {
  it("rotaciona uma sessão válida, mantendo a família e revogando a anterior", async () => {
    const repositorio = new RepositorioDeSessoesEmMemoria();
    const original = SessaoRefresh.iniciar("usuario-1", "token-original", UM_DIA_MS);
    await repositorio.criar(original);

    const renovarSessao = new RenovarSessao(repositorio, new GeradorDeTokenFalso());
    const resultado = await renovarSessao.executar("token-original");

    expect(resultado.accessToken).toBe("access(usuario-1)");
    expect(resultado.refreshToken).not.toBe("token-original");

    const sessaoOriginalPersistida = repositorio.sessoes.find(
      (s) => s.id === original.id,
    );
    expect(sessaoOriginalPersistida?.estaRevogada).toBe(true);

    const novaSessao = repositorio.sessoes.find(
      (s) => s.tokenHash === SessaoRefresh.hashDoToken(resultado.refreshToken),
    );
    expect(novaSessao?.familiaId).toBe(original.familiaId);
    expect(novaSessao?.estaRevogada).toBe(false);
  });

  it("rejeita token inexistente com SessaoInvalidaError", async () => {
    const repositorio = new RepositorioDeSessoesEmMemoria();
    const renovarSessao = new RenovarSessao(repositorio, new GeradorDeTokenFalso());

    await expect(renovarSessao.executar("token-que-nunca-existiu")).rejects.toThrow(
      SessaoInvalidaError,
    );
  });

  it("rejeita token expirado com SessaoInvalidaError", async () => {
    const repositorio = new RepositorioDeSessoesEmMemoria();
    const expirada = SessaoRefresh.iniciar("usuario-1", "token-expirado", -1);
    await repositorio.criar(expirada);

    const renovarSessao = new RenovarSessao(repositorio, new GeradorDeTokenFalso());

    await expect(renovarSessao.executar("token-expirado")).rejects.toThrow(
      SessaoInvalidaError,
    );
  });

  it("detecta reuso de token já rotacionado e revoga a família inteira", async () => {
    const repositorio = new RepositorioDeSessoesEmMemoria();
    const renovarSessao = new RenovarSessao(repositorio, new GeradorDeTokenFalso());

    const original = SessaoRefresh.iniciar("usuario-1", "token-1", UM_DIA_MS);
    await repositorio.criar(original);

    // Uso legítimo: rotaciona uma vez, token-1 vira revogado.
    const primeiraRenovacao = await renovarSessao.executar("token-1");

    // Reuso: alguém (um atacante que roubou token-1) tenta usá-lo de novo.
    await expect(renovarSessao.executar("token-1")).rejects.toThrow(SessaoInvalidaError);

    // A família inteira deveria estar revogada agora — inclusive a sessão
    // legítima gerada na primeira renovação.
    const sessaoLegitima = repositorio.sessoes.find(
      (s) => s.tokenHash === SessaoRefresh.hashDoToken(primeiraRenovacao.refreshToken),
    );
    expect(sessaoLegitima?.estaRevogada).toBe(true);

    await expect(renovarSessao.executar(primeiraRenovacao.refreshToken)).rejects.toThrow(
      SessaoInvalidaError,
    );
  });
});
