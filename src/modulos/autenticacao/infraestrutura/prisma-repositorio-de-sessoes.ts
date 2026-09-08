import type { PrismaClient } from "@prisma/client";
import { SessaoRefresh } from "../dominio/sessao-refresh.entidade.js";
import type { RepositorioDeSessoes } from "../aplicacao/portas/repositorio-de-sessoes.js";

export class PrismaRepositorioDeSessoes implements RepositorioDeSessoes {
  constructor(private readonly prisma: PrismaClient) {}

  async criar(sessao: SessaoRefresh): Promise<void> {
    const dados = sessao.paraPersistencia();
    await this.prisma.sessaoRefresh.create({ data: dados });
  }

  async buscarPorHashDeToken(tokenHash: string): Promise<SessaoRefresh | null> {
    const registro = await this.prisma.sessaoRefresh.findUnique({ where: { tokenHash } });
    return registro ? SessaoRefresh.reconstituir(registro) : null;
  }

  async salvar(sessao: SessaoRefresh): Promise<void> {
    const dados = sessao.paraPersistencia();
    await this.prisma.sessaoRefresh.update({
      where: { id: dados.id },
      data: { revogadaEm: dados.revogadaEm },
    });
  }

  async revogarFamilia(familiaId: string): Promise<void> {
    await this.prisma.sessaoRefresh.updateMany({
      where: { familiaId, revogadaEm: null },
      data: { revogadaEm: new Date() },
    });
  }
}
