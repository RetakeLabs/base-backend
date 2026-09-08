import type { Usuario } from "../../dominio/usuario.entidade.js";

// O service/caso de uso depende desta interface, nunca do PrismaClient
// direto (Dependency Inversion) — testável sem banco real, e absorve uma
// eventual troca de ORM numa camada só.
export interface RepositorioDeUsuarios {
  criar(usuario: Usuario): Promise<Usuario>;
  // Inclui senhaHash na reconstituição — necessário para o Caso de Uso de
  // login verificar a senha. `Usuario.paraDto()` continua sendo a única
  // fronteira de saída, então isso nunca vaza para o cliente.
  buscarPorEmail(email: string): Promise<Usuario | null>;
  buscarPorId(id: string): Promise<Usuario | null>;
}
