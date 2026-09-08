import { Router } from "express";
import { limitadorDeAutenticacao } from "../../../compartilhado/middlewares/seguranca.js";
import { validarSchema } from "../../../compartilhado/middlewares/validar-schema.js";
import type { AutenticacaoController } from "./autenticacao.controller.js";
import { autenticarSchema } from "./autenticacao.schema.js";

export function criarRotasDeAutenticacao(controller: AutenticacaoController): Router {
  const rotas = Router();

  rotas.post(
    "/sessoes",
    limitadorDeAutenticacao,
    validarSchema(autenticarSchema),
    controller.entrar,
  );
  rotas.post("/sessoes/atualizacao", controller.atualizar);
  rotas.delete("/sessoes", controller.sair);

  return rotas;
}
