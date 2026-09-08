import cookieParser from "cookie-parser";
import express, { type Express } from "express";
import type { PrismaClient } from "@prisma/client";
import { ambiente } from "./configuracao/ambiente.js";
import { aplicarMiddlewaresDeSeguranca } from "./compartilhado/middlewares/seguranca.js";
import { middlewareDeLogDeRequisicao } from "./compartilhado/observabilidade/logger.js";
import { rotaNaoEncontrada } from "./compartilhado/middlewares/rota-nao-encontrada.js";
import { tratadorDeErros } from "./compartilhado/middlewares/tratador-de-erros.js";
import { JoseGeradorDeToken } from "./compartilhado/seguranca/jose-gerador-de-token.js";
import { criarModuloDeUsuarios } from "./modulos/usuarios/usuario.modulo.js";
import { criarModuloDeAutenticacao } from "./modulos/autenticacao/autenticacao.modulo.js";

// Composition root da aplicação — todo módulo novo se registra aqui, num
// ponto único (backend-arquitetura-nodejs §1). Ordem dos `app.use` importa:
// log e segurança antes do parser, parser antes das rotas, rota-não-encontrada
// e tratador de erros sempre por último.
export function criarApp(prisma: PrismaClient): Express {
  const app = express();

  app.use(middlewareDeLogDeRequisicao);
  aplicarMiddlewaresDeSeguranca(app);
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  // Instanciado uma vez só e compartilhado entre módulos — o mesmo motivo
  // do PrismaClient singleton (backend-arquitetura-nodejs §1/§6).
  const geradorDeToken = new JoseGeradorDeToken(ambiente.JWT_SECRET);

  const moduloDeUsuarios = criarModuloDeUsuarios(prisma, geradorDeToken);
  const moduloDeAutenticacao = criarModuloDeAutenticacao(prisma, geradorDeToken);
  app.use(moduloDeUsuarios.rotas);
  app.use(moduloDeAutenticacao.rotas);

  app.use(rotaNaoEncontrada);
  app.use(tratadorDeErros);

  return app;
}
