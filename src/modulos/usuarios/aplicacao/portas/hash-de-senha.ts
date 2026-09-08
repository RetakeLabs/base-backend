// Abstração de hashing — o Caso de Uso nunca importa a lib de criptografia
// diretamente (D de SOLID), o que torna o algoritmo trocável e o teste de
// aplicação independente de custo real de Argon2/bcrypt.
export interface HashDeSenha {
  gerarHash(senhaEmTexto: string): Promise<string>;
}
