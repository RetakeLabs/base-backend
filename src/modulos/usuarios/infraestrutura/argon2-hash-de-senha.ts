import { hash, verify } from "@node-rs/argon2";
import type { HashDeSenha } from "../aplicacao/portas/hash-de-senha.js";

// Argon2id, não bcrypt: preferido por seguranca-appsec-lgpd §1. Custo
// calibrado por padrão da lib para ficar na faixa recomendada em hardware
// de produção — hashing é CPU-bound, mas roda via binding nativo assíncrono,
// não bloqueia o event loop (backend-arquitetura-nodejs §4).
export class Argon2HashDeSenha implements HashDeSenha {
  async gerarHash(senhaEmTexto: string): Promise<string> {
    return hash(senhaEmTexto);
  }

  async verificar(senhaEmTexto: string, hashArmazenado: string): Promise<boolean> {
    return verify(hashArmazenado, senhaEmTexto);
  }
}
