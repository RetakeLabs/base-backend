import type { GeradorDeToken } from "../../../../compartilhado/seguranca/gerador-de-token.js";
import { SessaoInvalidaError } from "../../dominio/erros/sessao-invalida.error.js";
import { SessaoRefresh } from "../../dominio/sessao-refresh.entidade.js";
import type { RepositorioDeSessoes } from "../portas/repositorio-de-sessoes.js";
import { DURACAO_REFRESH_TOKEN_MS } from "../constantes.js";

interface SaidaRenovarSessao {
  accessToken: string;
  refreshToken: string;
}

export class RenovarSessao {
  constructor(
    private readonly repositorioDeSessoes: RepositorioDeSessoes,
    private readonly geradorDeToken: GeradorDeToken,
  ) {}

  async executar(refreshTokenBruto: string): Promise<SaidaRenovarSessao> {
    const tokenHash = SessaoRefresh.hashDoToken(refreshTokenBruto);
    const sessaoAtual = await this.repositorioDeSessoes.buscarPorHashDeToken(tokenHash);

    if (!sessaoAtual) throw new SessaoInvalidaError();

    if (sessaoAtual.estaRevogada) {
      // Reuso de um token já rotacionado é o sinal clássico de roubo —
      // revoga a família inteira, não só esta sessão (seguranca-appsec-lgpd §1).
      await this.repositorioDeSessoes.revogarFamilia(sessaoAtual.familiaId);
      throw new SessaoInvalidaError();
    }

    if (sessaoAtual.estaExpirada) throw new SessaoInvalidaError();

    sessaoAtual.revogar();
    await this.repositorioDeSessoes.salvar(sessaoAtual);

    const novoTokenBruto = SessaoRefresh.gerarTokenBruto();
    const novaSessao = SessaoRefresh.rotacionar(
      sessaoAtual,
      novoTokenBruto,
      DURACAO_REFRESH_TOKEN_MS,
    );
    await this.repositorioDeSessoes.criar(novaSessao);

    const accessToken = await this.geradorDeToken.gerarAccessToken({
      usuarioId: sessaoAtual.usuarioId,
    });

    return { accessToken, refreshToken: novoTokenBruto };
  }
}
