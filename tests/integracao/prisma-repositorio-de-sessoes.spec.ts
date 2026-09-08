import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Usuario } from "../../src/modulos/usuarios/dominio/usuario.entidade.js";
import { PrismaRepositorioDeUsuarios } from "../../src/modulos/usuarios/infraestrutura/prisma-repositorio-de-usuarios.js";
import { SessaoRefresh } from "../../src/modulos/autenticacao/dominio/sessao-refresh.entidade.js";
import { PrismaRepositorioDeSessoes } from "../../src/modulos/autenticacao/infraestrutura/prisma-repositorio-de-sessoes.js";

const UM_DIA_MS = 1000 * 60 * 60 * 24;

// Exige Docker — roda separado via `npm run test:integracao`, fora do
// `test` padrão (Estratégia de Testes §2).
describe("PrismaRepositorioDeSessoes", () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;
  let repositorioDeSessoes: PrismaRepositorioDeSessoes;
  let usuario: Usuario;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine").start();
    const databaseUrl = container.getConnectionUri();

    execSync("npx prisma db push --skip-generate", {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: "inherit",
    });

    prisma = new PrismaClient({ datasourceUrl: databaseUrl });
    repositorioDeSessoes = new PrismaRepositorioDeSessoes(prisma);

    const repositorioDeUsuarios = new PrismaRepositorioDeUsuarios(prisma);
    usuario = await repositorioDeUsuarios.criar(
      Usuario.criar({
        nome: "Rubens Junior",
        email: "rubens@exemplo.com",
        senhaHash: "hash-fake",
      }),
    );
  }, 60_000);

  afterAll(async () => {
    await prisma.$disconnect();
    await container.stop();
  });

  it("persiste e recupera uma sessão pelo hash do token", async () => {
    const sessao = SessaoRefresh.iniciar(usuario.id, "token-bruto-1", UM_DIA_MS);
    await repositorioDeSessoes.criar(sessao);

    const encontrada = await repositorioDeSessoes.buscarPorHashDeToken(
      SessaoRefresh.hashDoToken("token-bruto-1"),
    );

    expect(encontrada?.id).toBe(sessao.id);
    expect(encontrada?.estaRevogada).toBe(false);
  });

  it("salvar() persiste a revogação individual", async () => {
    const sessao = SessaoRefresh.iniciar(usuario.id, "token-bruto-2", UM_DIA_MS);
    await repositorioDeSessoes.criar(sessao);

    sessao.revogar();
    await repositorioDeSessoes.salvar(sessao);

    const recarregada = await repositorioDeSessoes.buscarPorHashDeToken(
      SessaoRefresh.hashDoToken("token-bruto-2"),
    );
    expect(recarregada?.estaRevogada).toBe(true);
  });

  it("revogarFamilia() revoga todas as sessões da família de uma vez", async () => {
    const original = SessaoRefresh.iniciar(usuario.id, "token-bruto-3", UM_DIA_MS);
    await repositorioDeSessoes.criar(original);
    const rotacionada = SessaoRefresh.rotacionar(original, "token-bruto-4", UM_DIA_MS);
    await repositorioDeSessoes.criar(rotacionada);

    await repositorioDeSessoes.revogarFamilia(original.familiaId);

    const primeira = await repositorioDeSessoes.buscarPorHashDeToken(
      SessaoRefresh.hashDoToken("token-bruto-3"),
    );
    const segunda = await repositorioDeSessoes.buscarPorHashDeToken(
      SessaoRefresh.hashDoToken("token-bruto-4"),
    );

    expect(primeira?.estaRevogada).toBe(true);
    expect(segunda?.estaRevogada).toBe(true);
  });
});
