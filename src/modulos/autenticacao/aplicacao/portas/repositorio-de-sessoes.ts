import type { SessaoRefresh } from "../../dominio/sessao-refresh.entidade.js";

export interface RepositorioDeSessoes {
  criar(sessao: SessaoRefresh): Promise<void>;
  buscarPorHashDeToken(tokenHash: string): Promise<SessaoRefresh | null>;
  salvar(sessao: SessaoRefresh): Promise<void>;
  revogarFamilia(familiaId: string): Promise<void>;
}
