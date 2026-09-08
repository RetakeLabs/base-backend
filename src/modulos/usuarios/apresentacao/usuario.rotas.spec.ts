import express, { type Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { rotaNaoEncontrada } from "../../../compartilhado/middlewares/rota-nao-encontrada.js";
import { tratadorDeErros } from "../../../compartilhado/middlewares/tratador-de-erros.js";
import { middlewareDeLogDeRequisicao } from "../../../compartilhado/observabilidade/logger.js";
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
}

class HashDeSenhaFalso implements HashDeSenha {
  gerarHash(senhaEmTexto: string): Promise<string> {
    return Promise.resolve(`hash(${senhaEmTexto})`);
  }
}

function criarAppDeTeste(repositorio: RepositorioDeUsuarios): Express {
  const app = express();
  app.use(middlewareDeLogDeRequisicao);
  app.use(express.json());

  const modulo = montarModuloDeUsuarios({
    repositorioDeUsuarios: repositorio,
    hashDeSenha: new HashDeSenhaFalso(),
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
