import { describe, expect, it } from "vitest";
import type { Usuario } from "../../dominio/usuario.entidade.js";
import { UsuarioJaExisteError } from "../../dominio/erros/usuario-ja-existe.error.js";
import type { HashDeSenha } from "../portas/hash-de-senha.js";
import type { RepositorioDeUsuarios } from "../portas/repositorio-de-usuarios.js";
import { CriarUsuario } from "./criar-usuario.caso-de-uso.js";

// Fake, não mock: testa orquestração do Caso de Uso sem infraestrutura real
// (Estratégia de Testes §3) — mock aqui verificaria "como", não "o quê".
class RepositorioDeUsuariosEmMemoria implements RepositorioDeUsuarios {
  private usuarios: Usuario[] = [];

  criar(usuario: Usuario): Promise<Usuario> {
    const jaExiste = this.usuarios.some((u) => u.email === usuario.email);
    if (jaExiste) return Promise.reject(new UsuarioJaExisteError(usuario.email));
    this.usuarios.push(usuario);
    return Promise.resolve(usuario);
  }
}

class HashDeSenhaFalso implements HashDeSenha {
  gerarHash(senhaEmTexto: string): Promise<string> {
    return Promise.resolve(`hash(${senhaEmTexto})`);
  }
}

describe("CriarUsuario", () => {
  it("cria usuário com senha já hasheada, nunca em texto plano", async () => {
    const repositorio = new RepositorioDeUsuariosEmMemoria();
    const criarUsuario = new CriarUsuario(repositorio, new HashDeSenhaFalso());

    const usuario = await criarUsuario.executar({
      nome: "Rubens Junior",
      email: "rubens@exemplo.com",
      senha: "senha-super-secreta",
    });

    expect(usuario.senhaHash).toBe("hash(senha-super-secreta)");
    expect(usuario.senhaHash).not.toBe("senha-super-secreta");
  });

  it("propaga UsuarioJaExisteError para e-mail duplicado", async () => {
    const repositorio = new RepositorioDeUsuariosEmMemoria();
    const criarUsuario = new CriarUsuario(repositorio, new HashDeSenhaFalso());

    await criarUsuario.executar({
      nome: "Rubens Junior",
      email: "rubens@exemplo.com",
      senha: "senha-super-secreta",
    });

    await expect(
      criarUsuario.executar({
        nome: "Outro Nome",
        email: "rubens@exemplo.com",
        senha: "outra-senha",
      }),
    ).rejects.toThrow(UsuarioJaExisteError);
  });
});
