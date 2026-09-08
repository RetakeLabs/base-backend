import { describe, expect, it } from "vitest";
import type {
  GeradorDeToken,
  PayloadDoToken,
} from "../../../../compartilhado/seguranca/gerador-de-token.js";
import { Usuario } from "../../../usuarios/dominio/usuario.entidade.js";
import type { HashDeSenha } from "../../../usuarios/aplicacao/portas/hash-de-senha.js";
import type { RepositorioDeUsuarios } from "../../../usuarios/aplicacao/portas/repositorio-de-usuarios.js";
import { CredenciaisInvalidasError } from "../../dominio/erros/credenciais-invalidas.error.js";
import type { SessaoRefresh } from "../../dominio/sessao-refresh.entidade.js";
import type { RepositorioDeSessoes } from "../portas/repositorio-de-sessoes.js";
import { AutenticarUsuario } from "./autenticar-usuario.caso-de-uso.js";

class RepositorioDeUsuariosEmMemoria implements RepositorioDeUsuarios {
  constructor(private readonly usuarios: Usuario[] = []) {}
  criar(usuario: Usuario): Promise<Usuario> {
    this.usuarios.push(usuario);
    return Promise.resolve(usuario);
  }
  buscarPorEmail(email: string): Promise<Usuario | null> {
    return Promise.resolve(this.usuarios.find((u) => u.email === email) ?? null);
  }
  buscarPorId(id: string): Promise<Usuario | null> {
    return Promise.resolve(this.usuarios.find((u) => u.id === id) ?? null);
  }
}

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
  revogarFamilia(): Promise<void> {
    return Promise.resolve();
  }
}

class HashDeSenhaFalso implements HashDeSenha {
  gerarHash(senhaEmTexto: string): Promise<string> {
    return Promise.resolve(`hash(${senhaEmTexto})`);
  }
  verificar(senhaEmTexto: string, hash: string): Promise<boolean> {
    return Promise.resolve(`hash(${senhaEmTexto})` === hash);
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

function criarUsuarioDeTeste(): Usuario {
  return Usuario.criar({
    nome: "Rubens Junior",
    email: "rubens@exemplo.com",
    senhaHash: "hash(senha-correta)",
  });
}

describe("AutenticarUsuario", () => {
  it("autentica com credenciais corretas e cria uma sessão nova", async () => {
    const usuario = criarUsuarioDeTeste();
    const repositorioDeUsuarios = new RepositorioDeUsuariosEmMemoria([usuario]);
    const repositorioDeSessoes = new RepositorioDeSessoesEmMemoria();
    const autenticarUsuario = new AutenticarUsuario(
      repositorioDeUsuarios,
      repositorioDeSessoes,
      new HashDeSenhaFalso(),
      new GeradorDeTokenFalso(),
    );

    const resultado = await autenticarUsuario.executar({
      email: "rubens@exemplo.com",
      senha: "senha-correta",
    });

    expect(resultado.accessToken).toBe(`access(${usuario.id})`);
    expect(resultado.refreshToken).toBeTruthy();
    expect(repositorioDeSessoes.sessoes).toHaveLength(1);
    expect(repositorioDeSessoes.sessoes[0]?.usuarioId).toBe(usuario.id);
  });

  it("rejeita e-mail inexistente com o mesmo erro genérico de senha errada", async () => {
    const repositorioDeUsuarios = new RepositorioDeUsuariosEmMemoria([]);
    const autenticarUsuario = new AutenticarUsuario(
      repositorioDeUsuarios,
      new RepositorioDeSessoesEmMemoria(),
      new HashDeSenhaFalso(),
      new GeradorDeTokenFalso(),
    );

    await expect(
      autenticarUsuario.executar({ email: "ninguem@exemplo.com", senha: "qualquer" }),
    ).rejects.toThrow(CredenciaisInvalidasError);
  });

  it("rejeita senha incorreta com CredenciaisInvalidasError", async () => {
    const usuario = criarUsuarioDeTeste();
    const repositorioDeUsuarios = new RepositorioDeUsuariosEmMemoria([usuario]);
    const autenticarUsuario = new AutenticarUsuario(
      repositorioDeUsuarios,
      new RepositorioDeSessoesEmMemoria(),
      new HashDeSenhaFalso(),
      new GeradorDeTokenFalso(),
    );

    await expect(
      autenticarUsuario.executar({ email: "rubens@exemplo.com", senha: "senha-errada" }),
    ).rejects.toThrow(CredenciaisInvalidasError);
  });
});
