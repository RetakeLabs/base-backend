import type { Request, Response } from "express";
import { ehProducao } from "../../../configuracao/ambiente.js";
import { NaoAutenticadoError } from "../../../compartilhado/erros/app-error.js";
import type { AutenticarUsuario } from "../aplicacao/casos-de-uso/autenticar-usuario.caso-de-uso.js";
import type { RenovarSessao } from "../aplicacao/casos-de-uso/renovar-sessao.caso-de-uso.js";
import type { EncerrarSessao } from "../aplicacao/casos-de-uso/encerrar-sessao.caso-de-uso.js";
import { DURACAO_REFRESH_TOKEN_MS } from "../aplicacao/constantes.js";
import type { AutenticarBody } from "./autenticacao.schema.js";

const NOME_COOKIE_REFRESH = "refreshToken";
// Path restrito: o cookie só é enviado para as rotas que o usam, reduzindo
// a superfície de exposição em outras requisições (seguranca-appsec-lgpd §2).
const CAMINHO_COOKIE_REFRESH = "/sessoes";

function definirCookieDeRefresh(res: Response, tokenBruto: string): void {
  res.cookie(NOME_COOKIE_REFRESH, tokenBruto, {
    httpOnly: true,
    secure: ehProducao,
    sameSite: "strict",
    path: CAMINHO_COOKIE_REFRESH,
    maxAge: DURACAO_REFRESH_TOKEN_MS,
  });
}

function extrairRefreshTokenOuFalhar(req: Request): string {
  const token = req.cookies as Record<string, unknown> | undefined;
  const valor = token?.[NOME_COOKIE_REFRESH];
  if (typeof valor !== "string") throw new NaoAutenticadoError("Sessão não encontrada");
  return valor;
}

// Só traduz requisição → Caso de Uso → resposta HTTP
// (backend-arquitetura-nodejs §1) — a rotação/detecção de reuso mora
// inteiramente no domínio e nos casos de uso.
export class AutenticacaoController {
  constructor(
    private readonly autenticarUsuario: AutenticarUsuario,
    private readonly renovarSessao: RenovarSessao,
    private readonly encerrarSessao: EncerrarSessao,
  ) {}

  entrar = async (req: Request, res: Response): Promise<void> => {
    const { email, senha } = req.body as AutenticarBody;
    const resultado = await this.autenticarUsuario.executar({ email, senha });

    definirCookieDeRefresh(res, resultado.refreshToken);
    res.status(201).json({
      data: { accessToken: resultado.accessToken, usuario: resultado.usuario.paraDto() },
    });
  };

  atualizar = async (req: Request, res: Response): Promise<void> => {
    const refreshTokenBruto = extrairRefreshTokenOuFalhar(req);
    const resultado = await this.renovarSessao.executar(refreshTokenBruto);

    definirCookieDeRefresh(res, resultado.refreshToken);
    res.status(200).json({ data: { accessToken: resultado.accessToken } });
  };

  sair = async (req: Request, res: Response): Promise<void> => {
    const token = req.cookies as Record<string, unknown> | undefined;
    const refreshTokenBruto = token?.[NOME_COOKIE_REFRESH];

    if (typeof refreshTokenBruto === "string") {
      await this.encerrarSessao.executar(refreshTokenBruto);
    }

    res.clearCookie(NOME_COOKIE_REFRESH, { path: CAMINHO_COOKIE_REFRESH });
    res.status(204).send();
  };
}
