import { z } from "zod";

// O mesmo schema valida forma E vira a allowlist de campo aceito — só o que
// está aqui chega ao Caso de Uso (Mass Assignment, seguranca-appsec-lgpd §3).
export const criarUsuarioSchema = z.object({
  body: z.object({
    nome: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres"),
    email: z.string().trim().email("E-mail inválido"),
    // Custo de Argon2 já compensa política de senha curta, mas um mínimo
    // evita senha trivialmente vazia vinda de client mal formado.
    senha: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
  }),
});

export type CriarUsuarioBody = z.infer<typeof criarUsuarioSchema>["body"];
