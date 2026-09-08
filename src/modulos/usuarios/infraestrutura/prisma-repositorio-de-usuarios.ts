import { Prisma, type PrismaClient } from "@prisma/client";
import { Usuario } from "../dominio/usuario.entidade.js";
import { UsuarioJaExisteError } from "../dominio/erros/usuario-ja-existe.error.js";
import type { RepositorioDeUsuarios } from "../aplicacao/portas/repositorio-de-usuarios.js";

export class PrismaRepositorioDeUsuarios implements RepositorioDeUsuarios {
  constructor(private readonly prisma: PrismaClient) {}

  async criar(usuario: Usuario): Promise<Usuario> {
    try {
      // `select` explícito: nunca `res.json(prismaUser)` cru — senhaHash
      // nunca sai desta query, allowlist positiva (backend-arquitetura-nodejs §2/§6).
      const registro = await this.prisma.usuario.create({
        data: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          senhaHash: usuario.senhaHash,
        },
        select: { id: true, nome: true, email: true, criadoEm: true },
      });

      return Usuario.reconstituir({ ...registro, senhaHash: usuario.senhaHash });
    } catch (erro) {
      // P2002 = unique constraint violation. Sem esta tradução, um e-mail
      // duplicado vira 500 genérico em vez de 409 de negócio
      // (backend-arquitetura-nodejs §6).
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
        throw new UsuarioJaExisteError(usuario.email);
      }
      throw erro;
    }
  }

  async buscarPorEmail(email: string): Promise<Usuario | null> {
    const registro = await this.prisma.usuario.findUnique({
      where: { email },
      select: { id: true, nome: true, email: true, senhaHash: true, criadoEm: true },
    });

    return registro ? Usuario.reconstituir(registro) : null;
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    const registro = await this.prisma.usuario.findUnique({
      where: { id },
      select: { id: true, nome: true, email: true, senhaHash: true, criadoEm: true },
    });

    return registro ? Usuario.reconstituir(registro) : null;
  }
}
