# NEOGESYS · Architecture Patterns

> **Cosa non cambia mai quando si clona NEOGESYS su un nuovo verticale.**
> Multi-tenancy, RBAC, procedure tRPC, impersonation, layout guard,
> state persistence — tutto il middleware che rende la suite "NEOGESYS"
> invece di un generico gestionale.

---

## 1. Monorepo layout

```
neogesys-{SECTOR}/
├── apps/
│   ├── web/      (3000) → gestionale tenant
│   ├── admin/    (3001) → super admin console cross-tenant
│   └── api/      (3002) → Fastify + tRPC server
├── packages/
│   ├── db/          → Drizzle schema, migrations, seed
│   ├── schemas/     → Zod schemas shared client/server
│   ├── auth/        → JWT, role guards, tRPC middlewares
│   ├── ui/          → componenti condivisi (se servono)
│   ├── ai/          → Claude/OpenAI wrapper
│   ├── vault/       → secrets resolver
│   ├── integrations/→ API esterne (gateway pagamenti, federazioni, …)
│   └── tsconfig/    → tsconfig base
├── demo/            → HTML mock per ogni ruolo
└── docker-compose.yml
```

---

## 2. Multi-tenancy

### 2.1 Modello DB

Ogni tabella tenant-scoped ha una colonna `tenant_id uuid NOT NULL`
con FK a `tenants(id)` + index compound `(tenant_id, created_at)`.

Tabella `tenants`:
```sql
id uuid PK
slug text UNIQUE        -- "sc-milano", "asd-roma", ...
name text               -- "SC Milano"
piano text              -- trial | free | base | pro | enterprise
stato text              -- attivo | trial | sospeso
created_at timestamptz
-- ...campi custom per settore in 04-domain-mapping.md
```

### 2.2 Tenant resolution (header-based)

Il client Next invia header custom `x-dev-tenant-slug` in tutte le
richieste tRPC. Il middleware API legge l'header → lookup su `tenants`
→ inietta `tenant` nel context tRPC.

File `apps/web/src/lib/trpc.ts` (estratto):
```ts
const tenantSlug = currentUser.tenant === "NEOGESYS Platform"
  ? undefined  // super_admin no-context → NO header
  : currentUser.tenant;

headers: tenantSlug ? { "x-dev-tenant-slug": tenantSlug } : {},
```

**Regola**: se l'header manca, l'API **risponde 401** sulle procedure
`protectedProcedure`. Il super_admin deve o impersonare (→ header
valido) o stare sulle rotte `superAdminProcedure` (no header richiesto).

### 2.3 Impersonation

Il super_admin ha un menu tenant switcher (`TenantMenu`) che setta
`currentUser.tenant = "<slug>"`. Da quel momento il client invia
quell'header → l'API risolve il tenant → tutte le query diventano
scoped a quel tenant, **come se fosse un admin_tenant**.

Per tornare al contesto Platform: click "Esci da impersonation" →
`currentUser.tenant = "NEOGESYS Platform"`.

---

## 3. RBAC · 4 procedure types tRPC

File `apps/api/src/trpc/index.ts`:

```ts
// pubblico — no auth
export const publicProcedure = t.procedure;

// richiede user loggato (no tenant scoping)
export const protectedProcedure = t.procedure.use(isAuthenticated);

// richiede user loggato + ruolo ∈ {admin_tenant, super_admin}
export const adminProcedure = t.procedure.use(isAdmin);

// richiede user loggato + ruolo == super_admin
export const superAdminProcedure = t.procedure.use(isSuperAdmin);
```

| Procedure | Serve tenant_slug header? | Chi può chiamarla |
|---|---|---|
| `publicProcedure` | No | Chiunque |
| `protectedProcedure` | Sì (o impersonation) | Qualsiasi user loggato |
| `adminProcedure` | Sì (o impersonation) | admin_tenant, super_admin |
| `superAdminProcedure` | No (query cross-tenant) | super_admin |

Esempio router:
```ts
export const sociRouter = router({
  list: protectedProcedure              // ← tenant-scoped
    .input(z.object({ page: z.number() }))
    .query(({ ctx, input }) => {
      // ctx.tenant.id disponibile qui
      return db.select().from(soci).where(eq(soci.tenantId, ctx.tenant.id));
    }),

  create: adminProcedure                 // ← solo admin_tenant o super
    .input(socioCreateSchema)
    .mutation(({ ctx, input }) => { /* ... */ }),
});

export const piattaformaRouter = router({
  allTenants: superAdminProcedure        // ← cross-tenant
    .query(() => db.select().from(tenants)),
});
```

---

## 4. User roles

### 4.1 Ruoli canonici (template)

Ogni verticale ha **almeno** questi 3 ruoli fissi:
- `super_admin` — owner piattaforma, cross-tenant, impersonation
- `admin_tenant` — owner della società/organizzazione
- `contabile` — billing/fatture (o ruolo equivalente del settore)

Ruoli domain-specific sono definiti in `04-domain-mapping.md`.

### 4.2 Client-side user store

`apps/web/src/lib/current-user.ts` — Zustand persisted:
```ts
interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;                  // enum dei ruoli del settore
  tenant: string;              // slug, OPPURE "NEOGESYS Platform"
  initials: string;
}

// 8+ utenti demo in USERS_BY_ROLE per role switcher dev
```

Il super_admin ha sempre `tenant = "NEOGESYS Platform"` finché non
impersona. Questo string literal è il **marker** letto dal
layout guard e dal client tRPC.

---

## 5. Layout guard `PlatformContextEmpty`

File: `apps/web/src/components/layout/platform-context-empty.tsx`
Wired in: `apps/web/src/app/(dashboard)/layout.tsx`

```tsx
const PLATFORM_ALLOWED_ROUTES = ["/", "/tenants", "/billing", "/system", "/audit"];

const isPlatformContext = current.tenant === "NEOGESYS Platform";
const isAllowed = PLATFORM_ALLOWED_ROUTES.some(r =>
  pathname === r || pathname.startsWith(r + "/")
);

return (
  <main>
    {isPlatformContext && !isAllowed
      ? <PlatformContextEmpty pathname={pathname} />
      : children}
  </main>
);
```

Scopo: prevenire "Failed to fetch" quando super_admin (senza tenant
impersonato) visita una rotta tenant-scoped. Il placeholder spiega
che deve impersonare o andare alle sezioni Platform.

---

## 6. API project structure (Fastify + tRPC)

```
apps/api/src/
├── index.ts              → bootstrap Fastify
├── context.ts            → tRPC context (user, tenant, db)
├── trpc/
│   ├── index.ts          → procedure types
│   └── middlewares.ts    → isAuthenticated, isAdmin, isSuperAdmin
├── routers/
│   ├── index.ts          → appRouter combina tutto
│   ├── auth.ts           → login, refresh, logout
│   ├── tenant.ts         → CRUD tenant + getCurrent + overview
│   ├── {primary_entity}.ts  → es. soci.ts / pazienti.ts
│   ├── billing.ts
│   ├── dashboard.ts
│   ├── piattaforma.ts    → cross-tenant queries (super_admin only)
│   └── ...
└── env.ts                → Zod-validated env
```

---

## 7. DB patterns

### Migrations
- Drizzle Kit genera migrations in `packages/db/migrations/`
- Ogni migration è numerata: `0001_create_tenants.sql`, `0002_…`
- **Mai** editare migration committata → sempre nuova migration up/down

### Seed
- `packages/db/src/seed.ts`
- Crea: 1 super_admin, 3 tenant demo, 8 user demo per ruolo,
  20+ `{{PRIMARY_ENTITY_PLURAL}}`, dati di contorno
- Idempotente: se girato 2 volte non duplica

### Tipizzazione
- Drizzle schema → `type X = InferSelectModel<typeof xTable>`
- Zod schemas in `packages/schemas/` → validati sia client che server
- Mai inviare tipi "plain JSON" → tutto passa da Zod

---

## 8. Animation & state management

### Zustand stores
```
apps/web/src/lib/
├── current-user.ts   → useCurrentUser (persist: localStorage)
├── store.ts          → useUIStore (sidebar, command palette, AI drawer)
├── palettes.ts       → usePaletteStore (palette attiva, persist)
```

Regola: **1 store per concern, mai 1 megastore**. Persistenza solo
per stato che sopravvive al refresh (user, theme, palette).

### React Query (tRPC)
- Cache default `staleTime: 30s`
- `retry: false` su query che possono fallire "by design" (tenant
  resolution mancante su super_admin no-context)
- `enabled: condition` per skippare query in modo pulito — **mai**
  wrappare la query in un `if` (rompe le hook rules)

---

## 9. Docker compose setup

`docker-compose.yml` con 7 services (vedi `01-tech-stack-lock.md §Database`).
Volumes per postgres, redis, minio. Networks interne.

Sviluppo locale:
```bash
pnpm install
docker-compose up -d postgres redis minio
pnpm db:push   # crea schema
pnpm db:seed   # popola dati demo
pnpm dev       # turbo dev su web + api + admin
```

Dev-loop: turbo watch → tsx watch (api) + next dev (web/admin).
Hot reload funziona cross-package (modifica a `packages/schemas` →
rebuild automatico web+api).

---

## 10. Testing strategy

- **Unit**: vitest (NO jest, NO mocha)
- **Component**: React Testing Library + vitest
- **E2E**: Playwright (NO cypress)
- Coverage target: 70% su `packages/*`, 50% su `apps/*`

File test convivono con source: `foo.ts` + `foo.test.ts`.
Script: `pnpm test`, `pnpm test:e2e`.

---

## 11. Observability & errors

- **Logging**: pino strutturato (JSON), un logger per request
- **Errori API**: tRPC error formatter → normalizza in `{code, message, details}`
- **Sentry**: istanziato solo in production (per ora opzionale)
- **Audit log**: ogni mutation admin → scrive su `audit_events` table
  (vedi pagina `/audit`)

---

## 12. Checklist architettura per nuovo verticale

- [ ] `apps/web`, `apps/api`, `apps/admin` esistono e girano (`pnpm dev`)
- [ ] `packages/db`, `packages/schemas`, `packages/auth` 1:1 con source
- [ ] `tenants` table + tenant resolution header funziona
- [ ] 4 procedure types tRPC presenti (public/protected/admin/superAdmin)
- [ ] Almeno 3 ruoli: super_admin, admin_tenant, contabile (+ domain roles)
- [ ] `current-user.ts` con 8+ demo users, tenant="NEOGESYS Platform" per super
- [ ] Impersonation switcher in `TenantMenu` funziona
- [ ] `PlatformContextEmpty` wired in dashboard layout
- [ ] Seed idempotente con 20+ `{{PRIMARY_ENTITY_PLURAL}}`
- [ ] `typecheck` clean su tutte e 3 le apps
- [ ] HTTP 200 su tutte le route della sidebar
