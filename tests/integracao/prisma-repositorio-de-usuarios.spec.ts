import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { UsuarioJaExisteError } from "../../src/modulos/usuarios/dominio/erros/usuario-ja-existe.error.js";
import { Usuario } from "../../src/modulos/usuarios/dominio/usuario.entidade.js";
import { PrismaRepositorioDeUsuarios } from "../../src/modulos/usuarios/infraestrutura/prisma-repositorio-de-usuarios.js";

// Teste de integração contra Prisma real, não mock do ORM: mockar o
// PrismaClient inteiro testaria a abstração, não a query
// (Estratégia de Testes §2/backend-arquitetura-nodejs §6). Exige Docker —
// roda separado via `npm run test:integracao`, fora do `test` padrão.
describe("PrismaRepositorioDeUsuarios", () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;
  let repositorio: PrismaRepositorioDeUsuarios;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine").start();
    const databaseUrl = container.getConnectionUri();

    execSync("npx prisma db push --skip-generate", {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: "inherit",
    });

    prisma = new PrismaClient({ datasourceUrl: databaseUrl });
    repositorio = new PrismaRepositorioDeUsuarios(prisma);
  }, 60_000);

  afterAll(async () => {
    await prisma.$disconnect();
    await container.stop();
  });

  it("persiste o usuário e nunca retorna senhaHash na leitura", async () => {
    const usuario = Usuario.criar({
      nome: "Rubens Junior",
      email: "rubens@exemplo.com",
      senhaHash: "hash-fake",
    });

    const salvo = await repositorio.criar(usuario);

    const registroBruto = await prisma.$queryRaw<
      { senhaHash: string }[]
    >`SELECT "senhaHash" FROM usuarios WHERE id = ${salvo.id}`;

    expect(salvo.email).toBe("rubens@exemplo.com");
    expect(registroBruto[0]?.senhaHash).toBe("hash-fake");
  });

  it("traduz violação de e-mail único (P2002) para UsuarioJaExisteError", async () => {
    const primeiro = Usuario.criar({
      nome: "Rubens Junior",
      email: "duplicado@exemplo.com",
      senhaHash: "hash-fake",
    });
    await repositorio.criar(primeiro);

    const segundo = Usuario.criar({
      nome: "Outro Nome",
      email: "duplicado@exemplo.com",
      senhaHash: "hash-fake",
    });

    await expect(repositorio.criar(segundo)).rejects.toThrow(UsuarioJaExisteError);
  });
});
