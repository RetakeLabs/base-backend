import type { GeradorDeToken } from "../../../../compartilhado/seguranca/gerador-de-token.js";
import type { Usuario } from "../../../usuarios/dominio/usuario.entidade.js";
import type { HashDeSenha } from "../../../usuarios/aplicacao/portas/hash-de-senha.js";
import type { RepositorioDeUsuarios } from "../../../usuarios/aplicacao/portas/repositorio-de-usuarios.js";
import { CredenciaisInvalidasError } from "../../dominio/erros/credenciais-invalidas.error.js";
import { SessaoRefresh } from "../../dominio/sessao-refresh.entidade.js";
import type { RepositorioDeSessoes } from "../portas/repositorio-de-sessoes.js";
import { DURACAO_REFRESH_TOKEN_MS } from "../constantes.js";

interface EntradaAutenticarUsuario {
  email: string;
  senha: string;
}

interface SaidaAutenticarUsuario {
  accessToken: string;
  refreshToken: string;
  usuario: Usuario;
}

export class AutenticarUsuario {
  constructor(
    private readonly repositorioDeUsuarios: RepositorioDeUsuarios,
    private readonly repositorioDeSessoes: RepositorioDeSessoes,
    private readonly hashDeSenha: HashDeSenha,
    private readonly geradorDeToken: GeradorDeToken,
  ) {}

  async executar(entrada: EntradaAutenticarUsuario): Promise<SaidaAutenticarUsuario> {
    const usuario = await this.repositorioDeUsuarios.buscarPorEmail(
      entrada.email.trim().toLowerCase(),
    );

    // Mensagem sempre genérica — não revela se o e-mail existe ou se foi a
    // senha que errou (User Enumeration, seguranca-appsec-lgpd §6).
    if (!usuario) throw new CredenciaisInvalidasError();

    const senhaValida = await this.hashDeSenha.verificar(
      entrada.senha,
      usuario.senhaHash,
    );
    if (!senhaValida) throw new CredenciaisInvalidasError();

    const tokenBruto = SessaoRefresh.gerarTokenBruto();
    const sessao = SessaoRefresh.iniciar(
      usuario.id,
      tokenBruto,
      DURACAO_REFRESH_TOKEN_MS,
    );
    await this.repositorioDeSessoes.criar(sessao);

    const accessToken = await this.geradorDeToken.gerarAccessToken({
      usuarioId: usuario.id,
    });

    return { accessToken, refreshToken: tokenBruto, usuario };
  }
}
