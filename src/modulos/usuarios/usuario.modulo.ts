import type { PrismaClient } from "@prisma/client";
import type { Router } from "express";
import { CriarUsuario } from "./aplicacao/casos-de-uso/criar-usuario.caso-de-uso.js";
import type { HashDeSenha } from "./aplicacao/portas/hash-de-senha.js";
import type { RepositorioDeUsuarios } from "./aplicacao/portas/repositorio-de-usuarios.js";
import { Argon2HashDeSenha } from "./infraestrutura/argon2-hash-de-senha.js";
import { PrismaRepositorioDeUsuarios } from "./infraestrutura/prisma-repositorio-de-usuarios.js";
import { UsuarioController } from "./apresentacao/usuario.controller.js";
import { criarRotasDeUsuarios } from "./apresentacao/usuario.rotas.js";

interface DependenciasDoModuloDeUsuarios {
  repositorioDeUsuarios: RepositorioDeUsuarios;
  hashDeSenha: HashDeSenha;
}

// Recebe as portas já implementadas — é o que permite montar o módulo com
// fake/repositório em memória num teste de contrato, sem banco real
// (Estratégia de Testes §2).
export function montarModuloDeUsuarios(dependencias: DependenciasDoModuloDeUsuarios): {
  rotas: Router;
} {
  const criarUsuario = new CriarUsuario(
    dependencias.repositorioDeUsuarios,
    dependencias.hashDeSenha,
  );
  const controller = new UsuarioController(criarUsuario);

  return { rotas: criarRotasDeUsuarios(controller) };
}

// Composition root de produção: constructor injection manual — sem
// container DI pesado, resolve 90% dos casos (backend-arquitetura-nodejs §1).
export function criarModuloDeUsuarios(prisma: PrismaClient): { rotas: Router } {
  return montarModuloDeUsuarios({
    repositorioDeUsuarios: new PrismaRepositorioDeUsuarios(prisma),
    hashDeSenha: new Argon2HashDeSenha(),
  });
}
