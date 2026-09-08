import { PrismaClient } from "@prisma/client";
import { ehProducao } from "../../configuracao/ambiente.js";

// Singleton resiliente a hot-reload — instanciar mais de uma vez por processo
// esgota o pool de conexões em minutos sob carga (backend-arquitetura-nodejs §6).
const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalParaPrisma.prisma ?? new PrismaClient();

if (!ehProducao) {
  globalParaPrisma.prisma = prisma;
}
