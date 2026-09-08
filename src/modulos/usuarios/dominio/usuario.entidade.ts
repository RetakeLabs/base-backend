import { randomUUID } from "node:crypto";
import { ErroDeValidacao } from "../../../compartilhado/erros/app-error.js";

interface DadosParaCriarUsuario {
  nome: string;
  email: string;
  senhaHash: string;
}

interface UsuarioDto {
  id: string;
  nome: string;
  email: string;
  criadoEm: Date;
}

// Entidade protege sua própria consistência — não é um DTO passivo
// (padroes-arquitetura-nomenclatura §4). A camada de domínio não conhece
// Express nem Prisma.
export class Usuario {
  private constructor(
    public readonly id: string,
    public readonly nome: string,
    public readonly email: string,
    public readonly senhaHash: string,
    public readonly criadoEm: Date,
  ) {}

  static criar(dados: DadosParaCriarUsuario): Usuario {
    const nome = dados.nome.trim();
    if (nome.length === 0) {
      throw new ErroDeValidacao("Nome não pode ser vazio");
    }

    // E-mail é identidade case-insensitive — normalização é regra de
    // negócio da entidade, não detalhe de apresentação.
    const email = dados.email.trim().toLowerCase();

    return new Usuario(randomUUID(), nome, email, dados.senhaHash, new Date());
  }

  static reconstituir(dados: {
    id: string;
    nome: string;
    email: string;
    senhaHash: string;
    criadoEm: Date;
  }): Usuario {
    return new Usuario(
      dados.id,
      dados.nome,
      dados.email,
      dados.senhaHash,
      dados.criadoEm,
    );
  }

  // Fronteira de saída: nunca `res.json(usuarioCru)` — senhaHash nunca
  // atravessa esta borda (seguranca-appsec-lgpd §3, Mass Assignment do lado
  // da leitura).
  paraDto(): UsuarioDto {
    return { id: this.id, nome: this.nome, email: this.email, criadoEm: this.criadoEm };
  }
}
