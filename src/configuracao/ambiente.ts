import "dotenv/config";
import { z } from "zod";

// Falha no boot se faltar variável, nunca silenciosamente num request depois
// (seguranca-appsec-lgpd §3 — segredos nunca em código nem em log).
const esquemaDeAmbiente = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORTA: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),
  CORS_ORIGENS_PERMITIDAS: z
    .string()
    .min(1)
    .transform((valor) => valor.split(",").map((origem) => origem.trim())),
  NIVEL_LOG: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

const resultado = esquemaDeAmbiente.safeParse(process.env);

if (!resultado.success) {
  console.error(
    "Variáveis de ambiente inválidas:",
    resultado.error.flatten().fieldErrors,
  );
  process.exit(1);
}

export const ambiente = resultado.data;
export const ehProducao = ambiente.NODE_ENV === "production";
