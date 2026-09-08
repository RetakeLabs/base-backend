import { RecursoNaoEncontradoError } from "../../../../compartilhado/erros/app-error.js";
import type { Usuario } from "../../dominio/usuario.entidade.js";
import type { RepositorioDeUsuarios } from "../portas/repositorio-de-usuarios.js";

// Caso de uso do "perfil próprio" (GET /usuarios/eu) — o id vem do
// middleware de autenticação, nunca de parâmetro de URL (não há BOLA aqui
// porque o usuário só pode buscar a si mesmo).
export class BuscarUsuarioAutenticado {
  constructor(private readonly repositorioDeUsuarios: RepositorioDeUsuarios) {}

  async executar(usuarioId: string): Promise<Usuario> {
    const usuario = await this.repositorioDeUsuarios.buscarPorId(usuarioId);
    if (!usuario) throw new RecursoNaoEncontradoError("Usuário não encontrado");
    return usuario;
  }
}
