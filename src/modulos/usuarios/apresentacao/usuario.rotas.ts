import { Router } from "express";
import { limitadorDeAutenticacao } from "../../../compartilhado/middlewares/seguranca.js";
import { validarSchema } from "../../../compartilhado/middlewares/validar-schema.js";
import type { UsuarioController } from "./usuario.controller.js";
import { criarUsuarioSchema } from "./usuario.schema.js";

// Recurso (substantivo), não verbo na URL — POST /usuarios, nunca
// POST /criarUsuario (design-api-contrato §1).
export function criarRotasDeUsuarios(controller: UsuarioController): Router {
  const rotas = Router();

  rotas.post(
    "/usuarios",
    limitadorDeAutenticacao,
    validarSchema(criarUsuarioSchema),
    controller.criar,
  );

  return rotas;
}
