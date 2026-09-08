import { createHash, randomBytes, randomUUID } from "node:crypto";

// Agregado que protege a regra de Refresh Token Rotation (seguranca-appsec-lgpd
// §1): cada rotação nasce na mesma `familiaId`; reaparecer um token já
// revogado é o sinal de roubo que justifica revogar a família inteira — a
// entidade só expõe o estado (`estaRevogada`/`estaExpirada`), quem decide o
// que fazer com isso é o Caso de Uso.
export class SessaoRefresh {
  private constructor(
    public readonly id: string,
    public readonly usuarioId: string,
    public readonly familiaId: string,
    public readonly tokenHash: string,
    private revogadaEm: Date | null,
    public readonly expiraEm: Date,
    public readonly criadaEm: Date,
  ) {}

  static gerarTokenBruto(): string {
    return randomBytes(32).toString("hex");
  }

  static hashDoToken(tokenBruto: string): string {
    return createHash("sha256").update(tokenBruto).digest("hex");
  }

  // Início de uma nova cadeia de rotação — login.
  static iniciar(
    usuarioId: string,
    tokenBruto: string,
    duracaoEmMs: number,
  ): SessaoRefresh {
    return new SessaoRefresh(
      randomUUID(),
      usuarioId,
      randomUUID(),
      SessaoRefresh.hashDoToken(tokenBruto),
      null,
      new Date(Date.now() + duracaoEmMs),
      new Date(),
    );
  }

  // Nova sessão na MESMA família — é o que permite detectar reuso depois.
  static rotacionar(
    anterior: SessaoRefresh,
    tokenBruto: string,
    duracaoEmMs: number,
  ): SessaoRefresh {
    return new SessaoRefresh(
      randomUUID(),
      anterior.usuarioId,
      anterior.familiaId,
      SessaoRefresh.hashDoToken(tokenBruto),
      null,
      new Date(Date.now() + duracaoEmMs),
      new Date(),
    );
  }

  static reconstituir(dados: {
    id: string;
    usuarioId: string;
    familiaId: string;
    tokenHash: string;
    revogadaEm: Date | null;
    expiraEm: Date;
    criadaEm: Date;
  }): SessaoRefresh {
    return new SessaoRefresh(
      dados.id,
      dados.usuarioId,
      dados.familiaId,
      dados.tokenHash,
      dados.revogadaEm,
      dados.expiraEm,
      dados.criadaEm,
    );
  }

  get estaRevogada(): boolean {
    return this.revogadaEm !== null;
  }

  get estaExpirada(): boolean {
    return this.expiraEm.getTime() < Date.now();
  }

  revogar(): void {
    this.revogadaEm ??= new Date();
  }

  paraPersistencia() {
    return {
      id: this.id,
      usuarioId: this.usuarioId,
      familiaId: this.familiaId,
      tokenHash: this.tokenHash,
      revogadaEm: this.revogadaEm,
      expiraEm: this.expiraEm,
      criadaEm: this.criadaEm,
    };
  }
}
