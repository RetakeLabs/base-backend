import type { Request, Response } from "express";
import type { CriarUsuario } from "../aplicacao/casos-de-uso/criar-usuario.caso-de-uso.js";
import type { CriarUsuarioBody } from "./usuario.schema.js";

// Só traduz requisição → Caso de Uso → resposta HTTP. Zero regra de negócio,
// zero query de banco (backend-arquitetura-nodejs §1). Express 5 encaminha
// rejeição de handler async ao error middleware nativamente — sem
// asyncHandler.
export class UsuarioController {
  constructor(private readonly criarUsuario: CriarUsuario) {}

  criar = async (req: Request, res: Response): Promise<void> => {
    const { nome, email, senha } = req.body as CriarUsuarioBody;
    const usuario = await this.criarUsuario.executar({ nome, email, senha });
    res.status(201).json({ data: usuario.paraDto() });
  };
}
