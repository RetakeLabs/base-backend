import cookieParser from "cookie-parser";
import express, { type Express } from "express";
import request, { type Response } from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { exigirAutenticacao } from "../../../compartilhado/middlewares/exigir-autenticacao.js";
import { rotaNaoEncontrada } from "../../../compartilhado/middlewares/rota-nao-encontrada.js";
import { tratadorDeErros } from "../../../compartilhado/middlewares/tratador-de-erros.js";
import { middlewareDeLogDeRequisicao } from "../../../compartilhado/observabilidade/logger.js";
import { JoseGeradorDeToken } from "../../../compartilhado/seguranca/jose-gerador-de-token.js";
import type { HashDeSenha } from "../../usuarios/aplicacao/portas/hash-de-senha.js";
import type { RepositorioDeUsuarios } from "../../usuarios/aplicacao/portas/repositorio-de-usuarios.js";
import { Usuario } from "../../usuarios/dominio/usuario.entidade.js";
import { montarModuloDeUsuarios } from "../../usuarios/usuario.modulo.js";
import type { RepositorioDeSessoes } from "../aplicacao/portas/repositorio-de-sessoes.js";
import type { SessaoRefresh } from "../dominio/sessao-refresh.entidade.js";
import { montarModuloDeAutenticacao } from "../autenticacao.modulo.js";

const SEGREDO_DE_TESTE = "segredo-de-teste-com-mais-de-32-caracteres-para-jwt-hs256";
const EMAIL = "rubens@exemplo.com";
const SENHA = "senha-correta";

class RepositorioDeUsuariosEmMemoria implements RepositorioDeUsuarios {
  constructor(private readonly usuarios: Usuario[] = []) {}
  criar(usuario: Usuario): Promise<Usuario> {
    this.usuarios.push(usuario);
    return Promise.resolve(usuario);
  }
  buscarPorEmail(email: string): Promise<Usuario | null> {
    return Promise.resolve(this.usuarios.find((u) => u.email === email) ?? null);
  }
  buscarPorId(id: string): Promise<Usuario | null> {
    return Promise.resolve(this.usuarios.find((u) => u.id === id) ?? null);
  }
}

class RepositorioDeSessoesEmMemoria implements RepositorioDeSessoes {
  sessoes: SessaoRefresh[] = [];
  criar(sessao: SessaoRefresh): Promise<void> {
    this.sessoes.push(sessao);
    return Promise.resolve();
  }
  buscarPorHashDeToken(tokenHash: string): Promise<SessaoRefresh | null> {
    return Promise.resolve(this.sessoes.find((s) => s.tokenHash === tokenHash) ?? null);
  }
  salvar(sessao: SessaoRefresh): Promise<void> {
    const indice = this.sessoes.findIndex((s) => s.id === sessao.id);
    if (indice !== -1) this.sessoes[indice] = sessao;
    return Promise.resolve();
  }
  revogarFamilia(familiaId: string): Promise<void> {
    this.sessoes.forEach((s) => {
      if (s.familiaId === familiaId) s.revogar();
    });
    return Promise.resolve();
  }
}

class HashDeSenhaFalso implements HashDeSenha {
  gerarHash(senhaEmTexto: string): Promise<string> {
    return Promise.resolve(`hash(${senhaEmTexto})`);
  }
  verificar(senhaEmTexto: string, hash: string): Promise<boolean> {
    return Promise.resolve(`hash(${senhaEmTexto})` === hash);
  }
}

function extrairCookieDeRefresh(resposta: Response): string {
  const cabecalho = resposta.headers["set-cookie"] as unknown as string[] | undefined;
  const cookie = cabecalho?.find((c) => c.startsWith("refreshToken="));
  if (!cookie) throw new Error("cookie refreshToken não encontrado na resposta");
  return cookie.split(";")[0] ?? "";
}

describe("Módulo de autenticação", () => {
  let repositorioDeUsuarios: RepositorioDeUsuariosEmMemoria;
  let repositorioDeSessoes: RepositorioDeSessoesEmMemoria;
  let app: Express;
  let usuario: Usuario;

  beforeEach(() => {
    usuario = Usuario.criar({
      nome: "Rubens Junior",
      email: EMAIL,
      senhaHash: `hash(${SENHA})`,
    });
    repositorioDeUsuarios = new RepositorioDeUsuariosEmMemoria([usuario]);
    repositorioDeSessoes = new RepositorioDeSessoesEmMemoria();

    const geradorDeToken = new JoseGeradorDeToken(SEGREDO_DE_TESTE);
    const dependencias = {
      repositorioDeUsuarios,
      repositorioDeSessoes,
      hashDeSenha: new HashDeSenhaFalso(),
      geradorDeToken,
    };

    app = express();
    app.use(middlewareDeLogDeRequisicao);
    app.use(express.json());
    app.use(cookieParser());
    app.use(montarModuloDeAutenticacao(dependencias).rotas);
    app.use(montarModuloDeUsuarios(dependencias).rotas);
    app.get(
      "/rota-protegida-de-teste",
      exigirAutenticacao(geradorDeToken),
      (req, res) =>
        void res.status(200).json({ data: { usuarioId: req.usuarioAutenticado?.id } }),
    );
    app.use(rotaNaoEncontrada);
    app.use(tratadorDeErros);
  });

  describe("POST /sessoes (login)", () => {
    it("autentica com credenciais corretas: 201, accessToken no corpo, refresh em cookie httpOnly", async () => {
      const resposta = await request(app)
        .post("/sessoes")
        .send({ email: EMAIL, senha: SENHA });

      expect(resposta.status).toBe(201);
      expect(resposta.body.data.accessToken).toBeTruthy();
      expect(resposta.body.data.usuario).not.toHaveProperty("senhaHash");

      const cookie = extrairCookieDeRefresh(resposta);
      expect(cookie).toContain("refreshToken=");
      const cabecalhoCompleto = (
        resposta.headers["set-cookie"] as unknown as string[]
      )[0];
      expect(cabecalhoCompleto).toMatch(/HttpOnly/i);
      expect(cabecalhoCompleto).toMatch(/SameSite=Strict/i);
    });

    it("retorna 401 CREDENCIAIS_INVALIDAS para senha errada", async () => {
      const resposta = await request(app)
        .post("/sessoes")
        .send({ email: EMAIL, senha: "senha-errada" });

      expect(resposta.status).toBe(401);
      expect(resposta.body.error.code).toBe("CREDENCIAIS_INVALIDAS");
    });

    it("retorna o mesmo erro genérico para e-mail inexistente (sem vazar enumeração)", async () => {
      const resposta = await request(app)
        .post("/sessoes")
        .send({ email: "ninguem@exemplo.com", senha: "qualquer" });

      expect(resposta.status).toBe(401);
      expect(resposta.body.error.code).toBe("CREDENCIAIS_INVALIDAS");
    });
  });

  describe("POST /sessoes/atualizacao (refresh rotation)", () => {
    it("rotaciona o refresh token e emite um novo accessToken", async () => {
      const login = await request(app)
        .post("/sessoes")
        .send({ email: EMAIL, senha: SENHA });
      const cookieOriginal = extrairCookieDeRefresh(login);

      const renovacao = await request(app)
        .post("/sessoes/atualizacao")
        .set("Cookie", cookieOriginal);

      expect(renovacao.status).toBe(200);
      expect(renovacao.body.data.accessToken).toBeTruthy();
      // Não compara com o accessToken do login por igualdade de string: um
      // JWT HS256 é determinístico — mesmo payload no mesmo segundo produz
      // o mesmo token. O contrato real é "o refresh token de antes não
      // funciona mais", testado no caso de reuso abaixo.
    });

    it("sem cookie de sessão retorna 401", async () => {
      const resposta = await request(app).post("/sessoes/atualizacao");
      expect(resposta.status).toBe(401);
    });

    it("detecta reuso de um token já rotacionado e revoga a família inteira", async () => {
      const login = await request(app)
        .post("/sessoes")
        .send({ email: EMAIL, senha: SENHA });
      const cookieOriginal = extrairCookieDeRefresh(login);

      const primeiraRenovacao = await request(app)
        .post("/sessoes/atualizacao")
        .set("Cookie", cookieOriginal);
      const cookieNovo = extrairCookieDeRefresh(primeiraRenovacao);

      // Reuso do token já rotacionado — sinal de roubo.
      const reuso = await request(app)
        .post("/sessoes/atualizacao")
        .set("Cookie", cookieOriginal);
      expect(reuso.status).toBe(401);
      expect(reuso.body.error.code).toBe("SESSAO_INVALIDA");

      // A família inteira foi revogada — o token novo e legítimo também para de funcionar.
      const tentativaComTokenLegitimo = await request(app)
        .post("/sessoes/atualizacao")
        .set("Cookie", cookieNovo);
      expect(tentativaComTokenLegitimo.status).toBe(401);
    });
  });

  describe("DELETE /sessoes (logout)", () => {
    it("revoga a sessão e refresh subsequente falha", async () => {
      const login = await request(app)
        .post("/sessoes")
        .send({ email: EMAIL, senha: SENHA });
      const cookieOriginal = extrairCookieDeRefresh(login);

      const logout = await request(app).delete("/sessoes").set("Cookie", cookieOriginal);
      expect(logout.status).toBe(204);

      const renovacaoDepoisDoLogout = await request(app)
        .post("/sessoes/atualizacao")
        .set("Cookie", cookieOriginal);
      expect(renovacaoDepoisDoLogout.status).toBe(401);
    });

    it("é idempotente sem cookie", async () => {
      const resposta = await request(app).delete("/sessoes");
      expect(resposta.status).toBe(204);
    });
  });

  describe("integração com o middleware de autenticação", () => {
    it("o accessToken emitido no login autentica uma rota protegida", async () => {
      const login = await request(app)
        .post("/sessoes")
        .send({ email: EMAIL, senha: SENHA });
      const accessToken = login.body.data.accessToken as string;

      const resposta = await request(app)
        .get("/rota-protegida-de-teste")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(resposta.status).toBe(200);
      expect(resposta.body.data.usuarioId).toBe(usuario.id);
    });
  });
});
