# base-backend

Boilerplate corporativo Node.js + TypeScript para APIs SaaS da **ZeroLag Junior Otimizações e Tecnologias**, seguindo Clean Architecture por módulo (domínio → aplicação → infraestrutura ← apresentação).

## Stack

- **Node.js 20+** · **TypeScript** (strict) · **Express 5**
- **Prisma** + **PostgreSQL**
- **Zod** — validação e allowlist de escrita
- **Argon2id** (`@node-rs/argon2`) para hash de senha
- **jose** (JWT) + Refresh Token Rotation com detecção de reuso
- **Pino** — logging estruturado com `requestId`
- **Vitest** + **Supertest** + **Testcontainers**

## Como rodar localmente

```bash
cp .env.example .env          # ajuste os valores, principalmente JWT_SECRET
npm install
npm run db:up                 # sobe o Postgres do docker-compose (porta 5433)
npm run prisma:migrate:dev    # aplica as migrações
npm run dev                   # servidor com hot-reload em http://localhost:3000
```

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com hot-reload |
| `npm run build` / `npm start` | Build de produção e execução do build |
| `npm test` | Testes de unidade, aplicação e contrato (rápidos, sem Docker) |
| `npm run test:integracao` | Testes contra Postgres real via Testcontainers (exige Docker) |
| `npm run lint` / `npm run typecheck` | Qualidade de código |
| `npm run db:up` / `npm run db:down` | Sobe/derruba o Postgres de desenvolvimento |

## Estrutura

```
src/
├── modulos/
│   ├── usuarios/         # cadastro e perfil
│   │   ├── dominio/
│   │   ├── aplicacao/
│   │   ├── infraestrutura/
│   │   └── apresentacao/
│   └── autenticacao/     # login, refresh rotation, logout
├── compartilhado/        # erros, middlewares, observabilidade, segurança
├── configuracao/         # validação de ambiente (fail-fast)
├── app.ts                # composition root da aplicação
└── servidor.ts           # bootstrap + graceful shutdown
```

Cada módulo novo segue a mesma separação: regra de negócio na camada de domínio/aplicação, sem conhecer Express ou Prisma diretamente.

## CI

Todo push/PR para `main` roda lint, typecheck, testes (unidade/contrato e integração com Postgres real) e build — ver [.github/workflows/ci.yml](.github/workflows/ci.yml).
