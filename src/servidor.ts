import { ambiente } from "./configuracao/ambiente.js";
import { logger } from "./compartilhado/observabilidade/logger.js";
import { prisma } from "./compartilhado/prisma/cliente.js";
import { criarApp } from "./app.js";

const app = criarApp(prisma);

const servidor = app.listen(ambiente.PORTA, () => {
  logger.info(
    { porta: ambiente.PORTA, ambiente: ambiente.NODE_ENV },
    "servidor iniciado",
  );
});

// Captura SIGTERM/SIGINT, drena requisição em andamento e só então fecha o
// pool do Prisma — essencial para não cortar transação no meio durante
// deploy em ambiente orquestrado (backend-arquitetura-nodejs §4).
function encerrarComGraciosidade(sinal: string): void {
  logger.info({ sinal }, "encerrando servidor");
  servidor.close(() => {
    void (async () => {
      await prisma.$disconnect();
      logger.info("servidor encerrado");
      process.exit(0);
    })();
  });
}

process.on("SIGTERM", () => encerrarComGraciosidade("SIGTERM"));
process.on("SIGINT", () => encerrarComGraciosidade("SIGINT"));

// Rede de segurança de último nível — processo em estado desconhecido após
// exception não tratada, continuar rodando é mais arriscado que reiniciar
// (backend-arquitetura-nodejs §3).
process.on("unhandledRejection", (motivo) => {
  logger.error({ err: motivo }, "unhandledRejection");
});

process.on("uncaughtException", (erro) => {
  logger.error({ err: erro }, "uncaughtException");
  process.exit(1);
});
