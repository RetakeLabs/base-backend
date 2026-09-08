import { Router } from "express";
import { exigirAutenticacao } from "../../../compartilhado/middlewares/exigir-autenticacao.js";
import { limitadorDeAutenticacao } from "../../../compartilhado/middlewares/seguranca.js";
import { validarSchema } from "../../../compartilhado/middlewares/validar-schema.js";
import type { GeradorDeToken } from "../../../compartilhado/seguranca/gerador-de-token.js";
import type { UsuarioController } from "./usuario.controller.js";
import { criarUsuarioSchema } from "./usuario.schema.js";

// Recurso (substantivo), não verbo na URL — POST /usuarios, nunca
// POST /criarUsuario (design-api-contrato §1).
export function criarRotasDeUsuarios(
  controller: UsuarioController,
  geradorDeToken: GeradorDeToken,
): Router {
  const rotas = Router();

  rotas.post(
    "/usuarios",
    limitadorDeAutenticacao,
    validarSchema(criarUsuarioSchema),
    controller.criar,
  );
  rotas.get("/usuarios/eu", exigirAutenticacao(geradorDeToken), controller.buscarPerfil);

  return rotas;
}
