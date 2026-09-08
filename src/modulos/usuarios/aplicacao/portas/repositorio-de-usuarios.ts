import type { Usuario } from "../../dominio/usuario.entidade.js";

// O service/caso de uso depende desta interface, nunca do PrismaClient
// direto (Dependency Inversion) — testável sem banco real, e absorve uma
// eventual troca de ORM numa camada só.
export interface RepositorioDeUsuarios {
  criar(usuario: Usuario): Promise<Usuario>;
}
