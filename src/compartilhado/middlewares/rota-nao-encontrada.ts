import type { Request, Response } from "express";

// Precisa vir ANTES do tratador de erros global — sem isso, rota
// inexistente cai no handler padrão do Express (HTML, não JSON consistente
// com o resto da API).
export function rotaNaoEncontrada(req: Request, res: Response) {
  res.status(404).json({
    error: {
      code: "ROTA_NAO_ENCONTRADA",
      message: `Rota ${req.method} ${req.originalUrl} não existe`,
    },
  });
}
