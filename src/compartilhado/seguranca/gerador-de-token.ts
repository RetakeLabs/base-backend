export interface PayloadDoToken {
  usuarioId: string;
}

// Abstração de emissão/verificação de access token — o middleware de
// autenticação e os casos de uso de login dependem desta interface, nunca
// de uma lib de JWT concreta (D de SOLID).
export interface GeradorDeToken {
  gerarAccessToken(payload: PayloadDoToken): Promise<string>;
  verificarAccessToken(token: string): Promise<PayloadDoToken>;
}
