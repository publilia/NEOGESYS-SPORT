# NEOGESYS · Tech Stack Lock

> **Intento**: quando cloni NEOGESYS su un nuovo verticale, lo stack
> deve restare **identico**. Questo file è un contratto: Claude Code
> non può sostituire una di queste librerie/versioni con una
> "alternativa migliore" senza permesso esplicito del human.
>
> Il razionale: uniformità cross-vertical → lo stesso dev può
> saltare da NEOGESYS SPORT a NEOGESYS MEDICAL senza cambiare mental
> model. I bug fix si backportano 1:1. Le best practice si trasferiscono.

---

## Monorepo

| Tool | Versione | Ruolo |
|---|---|---|
| pnpm | 9.15.4 | Package manager |
| turbo | ^2.3.3 | Build orchestrator |
| @biomejs/biome | ^1.9.4 | Linter + formatter |
| typescript | ^5.7.3 | Linguaggio (strict mode) |

Struttura:
```
neogesys-{SECTOR}/
├── apps/
│   ├── web/      → gestionale tenant-scoped (Next 15 + Turbopack)
│   ├── api/      → backend tRPC/Fastify
│   └── admin/    → super admin console (Next 15, no Turbopack)
├── packages/
│   ├── db/       → Drizzle schema + migrations
│   ├── schemas/  → Zod shared schemas
│   ├── ui/       → componenti condivisi
│   ├── auth/     → JWT + role guards
│   ├── ai/       → wrapper Claude / OpenAI
│   ├── vault/    → secrets
│   ├── integrations/ → API esterne (federazioni, gateway pagamenti, …)
│   └── tsconfig/ → tsconfig base condiviso
├── docker-compose.yml  → 7 services
├── demo/         → HTML demo per ogni ruolo
└── scripts/      → release, seed, tooling
```

---

## Apps · web

| Lib | Versione | Perché |
|---|---|---|
| next | ^15.1.0 | App Router + Turbopack |
| react | ^19.0.0 | Features async server components |
| react-dom | ^19.0.0 | Pair con react |
| @trpc/client | ^11.0.0-rc.682 | API typesafe |
| @trpc/react-query | ^11.0.0-rc.682 | Hooks React Query |
| @tanstack/react-query | ^5.62.0 | Cache + invalidation |
| @tanstack/react-table | ^8.20.6 | Tabelle (headless) |
| zustand | ^5.0.2 | State client (persist) |
| zod | ^3.23.8 | Schema validation |
| react-hook-form | ^7.54.2 | Form management |
| @hookform/resolvers | ^3.9.1 | Zod ↔ RHF bridge |
| tailwindcss | ^4.0.0 | Utility CSS |
| @tailwindcss/postcss | ^4.2.2 | Build pipeline |
| framer-motion | ^11.15.0 | Animazioni complesse |
| recharts | ^2.15.0 | Grafici dashboard |
| lucide-react | ^0.468.0 | Icone (unico set consentito) |
| cmdk | ^1.0.4 | Command palette (⌘K) |
| sonner | ^1.7.1 | Toast notifications |
| next-themes | ^0.4.4 | Dark/light toggle |
| date-fns | ^4.1.0 | Date utilities (NO moment, NO dayjs) |
| qrcode | ^1.5.4 | QR generation (tessere, …) |

## Apps · api

| Lib | Versione | Perché |
|---|---|---|
| fastify | ^5.2.1 | Web server (NO Express) |
| @fastify/cors | ^11.0.0 | CORS |
| @fastify/cookie | ^11.0.2 | Auth cookies |
| @trpc/server | ^11.0.0 | API definitions |
| drizzle-orm | ^0.38.3 | ORM (NO Prisma) |
| pino | ^9.6.0 | Structured logs |
| dotenv | ^16.4.7 | Env management |
| tsx | ^4.19.2 | Dev runner (hot reload) |
| tsc-alias | ^1.8.10 | Build path aliases |

## Apps · admin

Identico a `web` ma senza Turbopack (si preferisce build stabile
per il Super Admin console — meno JS, più affidabilità).
Porta: `3001`. Porta web: `3000`. Porta api: `3002`.

---

## Database & cache (docker-compose)

| Service | Image | Purpose |
|---|---|---|
| neogesys-postgres | postgres:16-alpine | DB primario |
| neogesys-redis | redis:7-alpine | Cache + sessioni |
| neogesys-minio | minio/minio:latest | Object storage (tessere, PDF, doc) |
| neogesys-web | node:20 + pnpm | App Next 15 |
| neogesys-api | node:20 + pnpm | API Fastify |
| neogesys-admin | node:20 + pnpm | Super admin console |
| neogesys-demo | nginx:alpine | Serve `/demo/*.html` |

pgvector abilitata su postgres per embedding AI (ricerche semantiche).

---

## AI stack

| Provider | Model | Uso |
|---|---|---|
| Anthropic | Claude 4.5 (sonnet) | Default — chat, analisi, generazione |
| OpenAI | gpt-4o-mini | Fallback |
| Embeddings | text-embedding-3-small | pgvector lookup |

Wrapper centralizzato in `packages/ai/` — **mai chiamare i provider
direttamente dal codice app**. L'API key vive in `packages/vault/`.

---

## Auth

| Strategy | Lib | Note |
|---|---|---|
| JWT | `jose` (pinned in `packages/auth/package.json`) | Access + refresh |
| Session cookies | `@fastify/cookie` | HttpOnly, secure, SameSite=Lax |
| Role guards | tRPC middlewares | 4 procedure types (vedi `03-*.md`) |
| Impersonation | Header `x-impersonate-tenant` | Solo super_admin |

---

## Regole anti-drift

❌ **MAI** sostituire Fastify con Express, Hono, Elysia, …
❌ **MAI** sostituire Drizzle con Prisma, Kysely, TypeORM, …
❌ **MAI** sostituire tRPC con GraphQL, REST, tRPC v10, …
❌ **MAI** sostituire Tailwind con CSS-in-JS (styled-components, emotion, …)
❌ **MAI** sostituire lucide-react con heroicons, react-icons, …
❌ **MAI** sostituire pnpm con npm, yarn, bun
❌ **MAI** usare moment, dayjs, luxon → solo `date-fns`
❌ **MAI** aggiungere framework UI lib (Material UI, Ant Design, Chakra, shadcn) — componenti solo in `packages/ui`
❌ **MAI** aggiungere state manager (Redux, Jotai, Valtio) → solo Zustand
❌ **MAI** aggiungere form lib alternative (Formik, TanStack Form) → solo react-hook-form

Quando Claude Code sente l'impulso di introdurre una dipendenza nuova:
1. Verifica che NON esista già un pattern nel repo
2. Se manca, **chiedi al human prima di installare**
3. Se approvata, aggiornare questo file con la nuova riga

---

## Docker / local dev

```bash
# Porte canoniche
web:    localhost:3000
admin:  localhost:3001
api:    localhost:3002
demo:   localhost:3003

# Database
postgres: localhost:5432  (db: neogesys_{SECTOR_LOWER})
redis:    localhost:6379
minio:    localhost:9000 (console 9001)

# Container naming
neogesys-web
neogesys-api
neogesys-admin
neogesys-postgres
neogesys-redis
neogesys-minio
neogesys-demo
```

---

## Versioning

CalVer-ibrida: `AAAA.MM.N`
Esempio: `2026.4.1` (anno 2026, mese 4, release 1).
Script: `pnpm release:calver` → bump automatico.

`apps/web/src/lib/version.ts` è la source of truth → esportata come
`APP_VERSION` e `APP_RELEASE_DATE`, mostrata nel QuasarMenu.
