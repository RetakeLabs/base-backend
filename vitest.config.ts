import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    // Valores dummy — suficientes para src/configuracao/ambiente.ts passar
    // na validação fail-fast sem exigir um .env em CI.
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://usuario:senha@localhost:5432/base_backend_test",
      CORS_ORIGENS_PERMITIDAS: "http://localhost:3000",
      NIVEL_LOG: "error",
    },
  },
});
