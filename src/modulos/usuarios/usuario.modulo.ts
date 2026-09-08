import type { PrismaClient } from "@prisma/client";
import type { Router } from "express";
import type { GeradorDeToken } from "../../compartilhado/seguranca/gerador-de-token.js";
import { CriarUsuario } from "./aplicacao/casos-de-uso/criar-usuario.caso-de-uso.js";
import { BuscarUsuarioAutenticado } from "./aplicacao/casos-de-uso/buscar-usuario-autenticado.caso-de-uso.js";
import type { HashDeSenha } from "./aplicacao/portas/hash-de-senha.js";
import type { RepositorioDeUsuarios } from "./aplicacao/portas/repositorio-de-usuarios.js";
import { Argon2HashDeSenha } from "./infraestrutura/argon2-hash-de-senha.js";
import { PrismaRepositorioDeUsuarios } from "./infraestrutura/prisma-repositorio-de-usuarios.js";
import { UsuarioController } from "./apresentacao/usuario.controller.js";
import { criarRotasDeUsuarios } from "./apresentacao/usuario.rotas.js";

interface DependenciasDoModuloDeUsuarios {
  repositorioDeUsuarios: RepositorioDeUsuarios;
  hashDeSenha: HashDeSenha;
  geradorDeToken: GeradorDeToken;
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
  const buscarUsuarioAutenticado = new BuscarUsuarioAutenticado(
    dependencias.repositorioDeUsuarios,
  );
  const controller = new UsuarioController(criarUsuario, buscarUsuarioAutenticado);

  return { rotas: criarRotasDeUsuarios(controller, dependencias.geradorDeToken) };
}

// Composition root de produção: constructor injection manual — sem
// container DI pesado, resolve 90% dos casos (backend-arquitetura-nodejs §1).
// `geradorDeToken` é instanciado uma única vez em app.ts e compartilhado
// entre módulos (composição num ponto único).
export function criarModuloDeUsuarios(
  prisma: PrismaClient,
  geradorDeToken: GeradorDeToken,
): { rotas: Router } {
  return montarModuloDeUsuarios({
    repositorioDeUsuarios: new PrismaRepositorioDeUsuarios(prisma),
    hashDeSenha: new Argon2HashDeSenha(),
    geradorDeToken,
  });
}
