import { describe, expect, it } from "vitest";
import { RecursoNaoEncontradoError } from "../../../../compartilhado/erros/app-error.js";
import { Usuario } from "../../dominio/usuario.entidade.js";
import type { RepositorioDeUsuarios } from "../portas/repositorio-de-usuarios.js";
import { BuscarUsuarioAutenticado } from "./buscar-usuario-autenticado.caso-de-uso.js";

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

describe("BuscarUsuarioAutenticado", () => {
  it("retorna o usuário correspondente ao id", async () => {
    const usuario = Usuario.criar({
      nome: "Rubens Junior",
      email: "rubens@exemplo.com",
      senhaHash: "hash-fake",
    });
    const repositorio = new RepositorioDeUsuariosEmMemoria([usuario]);
    const buscarUsuarioAutenticado = new BuscarUsuarioAutenticado(repositorio);

    const encontrado = await buscarUsuarioAutenticado.executar(usuario.id);

    expect(encontrado.id).toBe(usuario.id);
  });

  it("lança RecursoNaoEncontradoError quando o id não existe", async () => {
    const repositorio = new RepositorioDeUsuariosEmMemoria([]);
    const buscarUsuarioAutenticado = new BuscarUsuarioAutenticado(repositorio);

    await expect(buscarUsuarioAutenticado.executar("id-inexistente")).rejects.toThrow(
      RecursoNaoEncontradoError,
    );
  });
});
