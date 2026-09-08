import { Usuario } from "../../dominio/usuario.entidade.js";
import type { HashDeSenha } from "../portas/hash-de-senha.js";
import type { RepositorioDeUsuarios } from "../portas/repositorio-de-usuarios.js";

interface EntradaCriarUsuario {
  nome: string;
  email: string;
  senha: string;
}

// O Caso de Uso É a regra de negócio, nomeada como tal — não um
// `service.update` genérico que esconde a intenção
// (padroes-arquitetura-nomenclatura §4).
export class CriarUsuario {
  constructor(
    private readonly repositorioDeUsuarios: RepositorioDeUsuarios,
    private readonly hashDeSenha: HashDeSenha,
  ) {}

  async executar(entrada: EntradaCriarUsuario): Promise<Usuario> {
    const senhaHash = await this.hashDeSenha.gerarHash(entrada.senha);

    const usuario = Usuario.criar({
      nome: entrada.nome,
      email: entrada.email,
      senhaHash,
    });

    // Unicidade de e-mail é garantida pela constraint do banco; o
    // repositório traduz a violação (P2002) para UsuarioJaExisteError —
    // evita race condition de um "buscar antes de criar" (backend-arquitetura-nodejs §6).
    return this.repositorioDeUsuarios.criar(usuario);
  }
}
