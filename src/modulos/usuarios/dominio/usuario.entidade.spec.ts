import { describe, expect, it } from "vitest";
import { ErroDeValidacao } from "../../../compartilhado/erros/app-error.js";
import { Usuario } from "./usuario.entidade.js";

describe("Usuario", () => {
  it("normaliza e-mail para minúsculas na criação", () => {
    const usuario = Usuario.criar({
      nome: "Rubens Junior",
      email: "Rubens@Exemplo.COM",
      senhaHash: "hash-fake",
    });

    expect(usuario.email).toBe("rubens@exemplo.com");
  });

  it("remove espaços nas extremidades do nome", () => {
    const usuario = Usuario.criar({
      nome: "  Rubens Junior  ",
      email: "rubens@exemplo.com",
      senhaHash: "hash-fake",
    });

    expect(usuario.nome).toBe("Rubens Junior");
  });

  it("rejeita nome vazio", () => {
    expect(() =>
      Usuario.criar({ nome: "   ", email: "rubens@exemplo.com", senhaHash: "hash-fake" }),
    ).toThrow(ErroDeValidacao);
  });

  it("nunca expõe senhaHash no DTO de saída", () => {
    const usuario = Usuario.criar({
      nome: "Rubens Junior",
      email: "rubens@exemplo.com",
      senhaHash: "hash-secreto",
    });

    expect(usuario.paraDto()).not.toHaveProperty("senhaHash");
  });
});
