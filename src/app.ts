import express, { type Express } from "express";
import type { PrismaClient } from "@prisma/client";
import { aplicarMiddlewaresDeSeguranca } from "./compartilhado/middlewares/seguranca.js";
import { middlewareDeLogDeRequisicao } from "./compartilhado/observabilidade/logger.js";
import { rotaNaoEncontrada } from "./compartilhado/middlewares/rota-nao-encontrada.js";
import { tratadorDeErros } from "./compartilhado/middlewares/tratador-de-erros.js";
import { criarModuloDeUsuarios } from "./modulos/usuarios/usuario.modulo.js";

// Composition root da aplicação — todo módulo novo se registra aqui, num
// ponto único (backend-arquitetura-nodejs §1). Ordem dos `app.use` importa:
// log e segurança antes do parser, parser antes das rotas, rota-não-encontrada
// e tratador de erros sempre por último.
export function criarApp(prisma: PrismaClient): Express {
  const app = express();

  app.use(middlewareDeLogDeRequisicao);
  aplicarMiddlewaresDeSeguranca(app);
  app.use(express.json({ limit: "100kb" }));

  const moduloDeUsuarios = criarModuloDeUsuarios(prisma);
  app.use(moduloDeUsuarios.rotas);

  app.use(rotaNaoEncontrada);
  app.use(tratadorDeErros);

  return app;
}
