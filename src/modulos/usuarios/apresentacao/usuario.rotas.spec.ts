import express, { type Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { rotaNaoEncontrada } from "../../../compartilhado/middlewares/rota-nao-encontrada.js";
import { tratadorDeErros } from "../../../compartilhado/middlewares/tratador-de-erros.js";
import { middlewareDeLogDeRequisicao } from "../../../compartilhado/observabilidade/logger.js";
import type {
  GeradorDeToken,
  PayloadDoToken,
} from "../../../compartilhado/seguranca/gerador-de-token.js";
import { UsuarioJaExisteError } from "../dominio/erros/usuario-ja-existe.error.js";
import type { Usuario } from "../dominio/usuario.entidade.js";
import type { HashDeSenha } from "../aplicacao/portas/hash-de-senha.js";
import type { RepositorioDeUsuarios } from "../aplicacao/portas/repositorio-de-usuarios.js";
import { montarModuloDeUsuarios } from "../usuario.modulo.js";

// Teste de contrato: request entra, response certa sai — não reimplementa
// regra de negócio já coberta no domínio/aplicação (Estratégia de Testes §2).
class RepositorioDeUsuariosEmMemoria implements RepositorioDeUsuarios {
  usuarios: Usuario[] = [];

  criar(usuario: Usuario): Promise<Usuario> {
    if (this.usuarios.some((u) => u.email === usuario.email)) {
      return Promise.reject(new UsuarioJaExisteError(usuario.email));
    }
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

class HashDeSenhaFalso implements HashDeSenha {
  gerarHash(senhaEmTexto: string): Promise<string> {
    return Promise.resolve(`hash(${senhaEmTexto})`);
  }

  verificar(senhaEmTexto: string, hash: string): Promise<boolean> {
    return Promise.resolve(`hash(${senhaEmTexto})` === hash);
  }
}

// Fake simples: codifica o id diretamente no token, sem JWT real — o
// contrato testado aqui é "rota exige e repassa o id autenticado", a
// verificação criptográfica em si já é coberta pelo teste do
// JoseGeradorDeToken/exigirAutenticacao.
const PREFIXO_TOKEN_FALSO = "token-valido-para:";

class GeradorDeTokenFalso implements GeradorDeToken {
  gerarAccessToken(payload: PayloadDoToken): Promise<string> {
    return Promise.resolve(`${PREFIXO_TOKEN_FALSO}${payload.usuarioId}`);
  }

  verificarAccessToken(token: string): Promise<PayloadDoToken> {
    if (!token.startsWith(PREFIXO_TOKEN_FALSO)) {
      return Promise.reject(new Error("token inválido"));
    }
    return Promise.resolve({ usuarioId: token.slice(PREFIXO_TOKEN_FALSO.length) });
  }
}

function criarAppDeTeste(repositorio: RepositorioDeUsuarios): Express {
  const app = express();
  app.use(middlewareDeLogDeRequisicao);
  app.use(express.json());

  const modulo = montarModuloDeUsuarios({
    repositorioDeUsuarios: repositorio,
    hashDeSenha: new HashDeSenhaFalso(),
    geradorDeToken: new GeradorDeTokenFalso(),
  });
  app.use(modulo.rotas);

  app.use(rotaNaoEncontrada);
  app.use(tratadorDeErros);
  return app;
}

describe("POST /usuarios", () => {
  let repositorio: RepositorioDeUsuariosEmMemoria;
  let app: Express;

  beforeEach(() => {
    repositorio = new RepositorioDeUsuariosEmMemoria();
    app = criarAppDeTeste(repositorio);
  });

  it("cria usuário e retorna 201 sem senhaHash no corpo", async () => {
    const resposta = await request(app).post("/usuarios").send({
      nome: "Rubens Junior",
      email: "rubens@exemplo.com",
      senha: "senha-super-secreta",
    });

    expect(resposta.status).toBe(201);
    expect(resposta.body.data).toMatchObject({
      nome: "Rubens Junior",
      email: "rubens@exemplo.com",
    });
    expect(resposta.body.data).not.toHaveProperty("senhaHash");
  });

  it("retorna 422 com código DADOS_INVALIDOS para e-mail malformado", async () => {
    const resposta = await request(app).post("/usuarios").send({
      nome: "Rubens Junior",
      email: "nao-e-um-email",
      senha: "senha-super-secreta",
    });

    expect(resposta.status).toBe(422);
    expect(resposta.body.error.code).toBe("DADOS_INVALIDOS");
  });

  it("retorna 409 com código USUARIO_JA_EXISTE para e-mail duplicado", async () => {
    const payload = {
      nome: "Rubens Junior",
      email: "rubens@exemplo.com",
      senha: "senha-super-secreta",
    };

    await request(app).post("/usuarios").send(payload);
    const segunda = await request(app).post("/usuarios").send(payload);

    expect(segunda.status).toBe(409);
    expect(segunda.body.error.code).toBe("USUARIO_JA_EXISTE");
  });
});

describe("GET /usuarios/eu", () => {
  let repositorio: RepositorioDeUsuariosEmMemoria;
  let app: Express;

  beforeEach(() => {
    repositorio = new RepositorioDeUsuariosEmMemoria();
    app = criarAppDeTeste(repositorio);
  });

  it("retorna 401 sem token", async () => {
    const resposta = await request(app).get("/usuarios/eu");

    expect(resposta.status).toBe(401);
    expect(resposta.body.error.code).toBe("NAO_AUTENTICADO");
  });

  it("retorna 401 com token malformado", async () => {
    const resposta = await request(app)
      .get("/usuarios/eu")
      .set("Authorization", "Bearer token-invalido");

    expect(resposta.status).toBe(401);
  });

  it("retorna o perfil do usuário autenticado", async () => {
    const criado = await request(app).post("/usuarios").send({
      nome: "Rubens Junior",
      email: "rubens@exemplo.com",
      senha: "senha-super-secreta",
    });
    const token = `${PREFIXO_TOKEN_FALSO}${criado.body.data.id}`;

    const resposta = await request(app)
      .get("/usuarios/eu")
      .set("Authorization", `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.data).toMatchObject({
      id: criado.body.data.id,
      email: "rubens@exemplo.com",
    });
  });
});
