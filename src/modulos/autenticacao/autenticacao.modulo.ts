import type { PrismaClient } from "@prisma/client";
import type { Router } from "express";
import type { GeradorDeToken } from "../../compartilhado/seguranca/gerador-de-token.js";
import type { HashDeSenha } from "../usuarios/aplicacao/portas/hash-de-senha.js";
import type { RepositorioDeUsuarios } from "../usuarios/aplicacao/portas/repositorio-de-usuarios.js";
import { Argon2HashDeSenha } from "../usuarios/infraestrutura/argon2-hash-de-senha.js";
import { PrismaRepositorioDeUsuarios } from "../usuarios/infraestrutura/prisma-repositorio-de-usuarios.js";
import { AutenticarUsuario } from "./aplicacao/casos-de-uso/autenticar-usuario.caso-de-uso.js";
import { RenovarSessao } from "./aplicacao/casos-de-uso/renovar-sessao.caso-de-uso.js";
import { EncerrarSessao } from "./aplicacao/casos-de-uso/encerrar-sessao.caso-de-uso.js";
import type { RepositorioDeSessoes } from "./aplicacao/portas/repositorio-de-sessoes.js";
import { PrismaRepositorioDeSessoes } from "./infraestrutura/prisma-repositorio-de-sessoes.js";
import { AutenticacaoController } from "./apresentacao/autenticacao.controller.js";
import { criarRotasDeAutenticacao } from "./apresentacao/autenticacao.rotas.js";

interface DependenciasDoModuloDeAutenticacao {
  repositorioDeUsuarios: RepositorioDeUsuarios;
  repositorioDeSessoes: RepositorioDeSessoes;
  hashDeSenha: HashDeSenha;
  geradorDeToken: GeradorDeToken;
}

export function montarModuloDeAutenticacao(
  dependencias: DependenciasDoModuloDeAutenticacao,
): { rotas: Router } {
  const autenticarUsuario = new AutenticarUsuario(
    dependencias.repositorioDeUsuarios,
    dependencias.repositorioDeSessoes,
    dependencias.hashDeSenha,
    dependencias.geradorDeToken,
  );
  const renovarSessao = new RenovarSessao(
    dependencias.repositorioDeSessoes,
    dependencias.geradorDeToken,
  );
  const encerrarSessao = new EncerrarSessao(dependencias.repositorioDeSessoes);

  const controller = new AutenticacaoController(
    autenticarUsuario,
    renovarSessao,
    encerrarSessao,
  );

  return { rotas: criarRotasDeAutenticacao(controller) };
}

// `geradorDeToken` chega pronto — é instanciado uma única vez no
// composition root da aplicação (app.ts) e compartilhado com o módulo de
// usuários, que também protege uma rota com ele.
export function criarModuloDeAutenticacao(
  prisma: PrismaClient,
  geradorDeToken: GeradorDeToken,
): { rotas: Router } {
  return montarModuloDeAutenticacao({
    repositorioDeUsuarios: new PrismaRepositorioDeUsuarios(prisma),
    repositorioDeSessoes: new PrismaRepositorioDeSessoes(prisma),
    hashDeSenha: new Argon2HashDeSenha(),
    geradorDeToken,
  });
}
