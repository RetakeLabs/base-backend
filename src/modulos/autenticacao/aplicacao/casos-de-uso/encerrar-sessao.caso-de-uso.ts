import { SessaoRefresh } from "../../dominio/sessao-refresh.entidade.js";
import type { RepositorioDeSessoes } from "../portas/repositorio-de-sessoes.js";

export class EncerrarSessao {
  constructor(private readonly repositorioDeSessoes: RepositorioDeSessoes) {}

  async executar(refreshTokenBruto: string): Promise<void> {
    const tokenHash = SessaoRefresh.hashDoToken(refreshTokenBruto);
    const sessao = await this.repositorioDeSessoes.buscarPorHashDeToken(tokenHash);

    // Logout é idempotente — token inexistente ou já revogado não é erro,
    // o resultado desejado (sessão encerrada) já vale.
    if (sessao) await this.repositorioDeSessoes.revogarFamilia(sessao.familiaId);
  }
}
