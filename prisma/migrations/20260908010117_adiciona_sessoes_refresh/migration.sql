-- CreateTable
CREATE TABLE "sessoes_refresh" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "familiaId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "revogadaEm" TIMESTAMP(3),
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessoes_refresh_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sessoes_refresh_tokenHash_key" ON "sessoes_refresh"("tokenHash");

-- CreateIndex
CREATE INDEX "sessoes_refresh_familiaId_idx" ON "sessoes_refresh"("familiaId");

-- AddForeignKey
ALTER TABLE "sessoes_refresh" ADD CONSTRAINT "sessoes_refresh_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
