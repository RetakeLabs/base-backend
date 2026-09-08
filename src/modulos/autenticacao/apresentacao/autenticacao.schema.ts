import { z } from "zod";

export const autenticarSchema = z.object({
  body: z.object({
    email: z.string().trim().email("E-mail inválido"),
    // Sem regra de formato aqui — a política de senha é validada na
    // criação/troca (usuario.schema.ts), não no login.
    senha: z.string().min(1, "Senha obrigatória"),
  }),
});

export type AutenticarBody = z.infer<typeof autenticarSchema>["body"];
