# NEOGESYS SPORT · Stack Tecnologico

## 📋 Panoramica

Piattaforma **SaaS multi-tenant** per la gestione di organizzazioni sportive italiane (ASD, SSD, federazioni, palestre, scuole di sport).

**Architettura:** Monorepo Turborepo + pnpm  
**Deployment:** Docker + Kubernetes / Railway / Vercel  
**Database:** PostgreSQL 15+ con RLS (Row Level Security)  

---

## 🏗️ Monorepo Structure

```
NEOGESYS-SPORT/
├── apps/
│   ├── web/               # Next.js 15 frontend (tenant app)
│   ├── api/               # Fastify 5 backend API
│   ├── admin/             # Next.js 15 admin dashboard
│   ├── portale-socio/     # Next.js 15 member portal
│   └── docs/              # Docusaurus 3 documentation
│
├── packages/
│   ├── db/                # Drizzle ORM schema + migrations
│   ├── auth/              # Better Auth + RBAC permissions
│   ├── vault/             # AES-256-GCM credential encryption
│   ├── integrations/      # Google / Microsoft providers
│   ├── schemas/           # Zod validation schemas
│   ├── jobs/              # Inngest workflows + BullMQ jobs
│   └── ui/                # shadcn/ui + Radix components
│
├── demo/                  # HTML5 standalone demos (5 roles)
├── docker/                # Docker Compose & K8s manifests
├── docs/                  # Architecture & API docs
└── turbo.json / pnpm-workspace.yaml
```

---

## 🔧 Core Stack

### **Frontend** (apps/web, apps/admin, apps/portale-socio)
- **Framework:** Next.js 15 (App Router, React 19)
- **TypeScript:** Strict mode
- **UI Kit:** shadcn/ui + Radix UI
- **Styling:** Tailwind CSS 4 with CSS variables (8 palettes)
- **Theme:** Light/Dark/System + dynamic palette switching
- **Forms:** React Hook Form + Zod
- **State:** TanStack Query v5 + Zustand
- **HTTP:** tRPC v11 (end-to-end type safety)
- **Icons:** Lucide React

### **Backend** (apps/api)
- **Runtime:** Node.js 22 LTS
- **Framework:** Fastify 5
- **tRPC:** v11 with Fastify adapter
- **Type Safety:** TypeScript strict
- **CORS:** @fastify/cors
- **Helmet:** Security headers
- **Logging:** Pino
- **Environment:** dotenv + validation

### **Database** (packages/db)
- **Engine:** PostgreSQL 15+
- **ORM:** Drizzle ORM (type-safe)
- **Extensions:** pgvector (AI embeddings), pgcrypto (encryption)
- **Row Security:** PostgreSQL RLS policies
- **Migrations:** Drizzle migrations with `current_setting('app.current_tenant')`
- **Connection Pool:** node-postgres (pg)

### **Authentication & Authorization** (packages/auth)
- **Auth Provider:** Better Auth (session-based)
- **2FA:** TOTP (Time-based One-Time Password)
- **RBAC:** Custom permission matrix (7 roles × 15 modules)
- **Multi-tenant Isolation:** Tenant middleware + RLS
- **Password:** bcrypt hashing

### **Security & Secrets** (packages/vault)
- **Encryption:** AES-256-GCM (NIST standard)
- **Key Management:** KMS-backed per-tenant keys
- **Storage:** Encrypted credentials in PostgreSQL
- **Integrations:** Google OAuth 2.0, Microsoft Entra ID
- **No Hardcoded Secrets:** All credentials in vault

### **Integrations** (packages/integrations)
- **Google Cloud:**
  - Google Drive API v3 (file storage)
  - Google Calendar API v3 (event sync)
  - OAuth 2.0 authorization flow
  
- **Microsoft 365:**
  - Microsoft Graph API v1.0 (OneDrive, Outlook Calendar)
  - Entra ID (Azure AD) authentication
  - OAuth 2.0 authorization flow

- **Unified Providers:**
  - `CalendarProvider` interface (Google / Microsoft)
  - `CloudStorageProvider` interface (Google Drive / OneDrive)
  - `SyncService` for event/file synchronization

### **AI & ML** (packages/jobs + Claude API)
- **Model:** Anthropic Claude (Sonnet 3.5)
- **Features:**
  - Optical Character Recognition (OCR) for documents
  - Churn prediction (ML on member data)
  - Semantic search with pgvector embeddings
  - Email generation & summarization
- **API Client:** @anthropic-ai/sdk

### **Job Queues & Workflows** (packages/jobs)
- **Durable Workflows:** Inngest (background jobs, retries)
- **Immediate Jobs:** BullMQ (in-process queue)
- **Scheduled Tasks:** cron patterns
- **Types:** 
  - `calendar-sync` — Sync Google/Microsoft calendars daily
  - `storage-cleanup` — Archive old documents
  - `email-batch` — Send bulk communications
  - `churn-prediction` — Weekly ML analysis

### **Validation & Schemas** (packages/schemas)
- **Runtime Validation:** Zod
- **API Schemas:** tRPC inputs/outputs
- **Database:** Drizzle type inference
- **Tenant Data:** Strict schema per module

### **UI Components** (packages/ui)
- **Base:** shadcn/ui on Radix UI
- **Customization:** CSS variables for palette system
- **Icons:** Lucide React (200+ icons)
- **Responsive:** Mobile-first + Tailwind breakpoints
- **Accessibility:** ARIA labels, keyboard navigation

---

## 🗄️ Database Schema

### **Core Tables**
- **tenant** — Organizations (multi-tenant isolation)
- **users** — User accounts per tenant
- **user_sessions** — Better Auth sessions
- **user_roles** — RBAC role assignments

### **Operational Data**
- **soci** — Members / participants
- **corsi** — Classes / courses
- **iscritti_corsi** — Course enrollment
- **certificati_medici** — Medical certificates
- **quote** — Membership fees / payments
- **eventi** — Events / competitions
- **contabilita** — Accounting entries (prima nota)
- **comunicazioni** — Email/SMS messages

### **Integration & Storage**
- **tenant_integrations** — OAuth tokens + credentials (encrypted)
- **calendar_sync** — Google/Microsoft calendar sync state
- **calendar_sync_items** — Synced events
- **cloud_storage_links** — File references (Drive/OneDrive)

### **AI & Analytics**
- **soci_embeddings** — pgvector embeddings for similarity search
- **churn_predictions** — ML churn risk scores

---

## 📊 Permissions & RBAC

### **7 Roles**
1. **super_admin** — Platform management (all tenants)
2. **admin_tenant** — Tenant administration (all modules)
3. **coordinatore** — Operational management (soci, corsi, comunicazioni)
4. **istruttore** — Teaching (own courses, attendees)
5. **user** — Member self-service (personal data, enrollments)
6. **guest** — Unauthenticated preview
7. (future) **accountant** — Billing + finance only

### **15 Modules** (per role permission matrix)
1. Soci (members)
2. Certificati Medici (medical certs)
3. Corsi (courses)
4. Eventi (events)
5. Quote (payments)
6. Contabilità (accounting)
7. Comunicazioni (email/SMS)
8. Documenti (document storage)
9. Integrazioni (integrations)
10. Utenti (user management)
11. Impostazioni (settings)
12. Reporting (dashboards)
13. Billing (subscription)
14. Audit Log (compliance)
15. AI (Claude features)

---

## 🎨 Frontend Features

### **Theming & Personalization**
- **8 Color Palettes:** default, ocean, forest, sunset, monochrome, vibrant, corporate, sport
- **3 Theme Modes:** light, dark, system (auto)
- **Layout:** Sidebar (240px / collapsed 64px) or Topbar
- **Persistence:** localStorage for preferences

### **Navigation & UX**
- **Sidebar Navigation:** 11 main items + AI assistant
- **Command Palette (⌘K):** Quick search across soci, corsi, actions
- **AI Drawer (⌘J):** Claude chat with context awareness
- **Mobile Responsive:** Hamburger menu + drawer on <1024px
- **Keyboard Shortcuts:** ⌘K, ⌘J, Esc

### **Pages**
- **dashboard/** — KPI cards, incasso chart, alerts, upcoming events
- **soci/** — Member list with filters, search, pagination
- **corsi/** — Course grid with capacity bar
- **calendario/** — Month view with events overlay
- **quote/** — Payment status with summary cards
- **eventi/** — Competition cards with registration
- **documenti/** — File storage with AI OCR classification
- **comunicazioni/** — Email/SMS campaigns with templates
- **contabilita/** — Prima nota + bilancio tabs
- **integrazioni/** — 7 provider categories (Stripe, Resend, Google, etc.)
- **impostazioni/** — Layout, theme, palette, tenant settings

---

## 🔐 Security Architecture

### **Multi-tenant Isolation**
- PostgreSQL Row Level Security (RLS) policies
- Tenant context: `current_setting('app.current_tenant')`
- Middleware enforces tenant from Host header (subdomain)

### **Encryption at Rest & In Transit**
- TLS 1.3 for all HTTPS connections
- AES-256-GCM for credential vault
- KMS-backed key derivation (per-tenant)

### **API Security**
- CORS origin validation
- CSRF tokens (Better Auth)
- Rate limiting (planned: Unkey)
- Input validation (Zod schemas)

### **Audit & Compliance**
- Audit log table for all write operations
- GDPR-ready (data export, right-to-delete)
- SOC 2 preparation (in progress)

---

## 📦 Key Dependencies

### **Runtime**
```json
{
  "next": "15.0.x",
  "fastify": "5.x",
  "react": "19.x",
  "typescript": "5.x",
  "drizzle-orm": "0.37.x",
  "better-auth": "latest",
  "trpc": "11.x",
  "@anthropic-ai/sdk": "latest",
  "tailwindcss": "4.x",
  "zod": "3.x",
  "lucide-react": "latest"
}
```

### **Development**
```json
{
  "@types/node": "22.x",
  "@types/react": "19.x",
  "typescript": "5.x",
  "eslint": "9.x",
  "prettier": "3.x",
  "vitest": "latest",
  "turbo": "2.x",
  "pnpm": "9.15.4"
}
```

---

## 🚀 Deployment

### **Local Development**
```bash
pnpm install
pnpm db:push              # Drizzle migrations
pnpm dev                  # Turbo watch all apps
# Opens: http://localhost:3000 (web), :4000 (api)
```

### **Docker**
```dockerfile
# Multi-stage build: Next.js optimized
# Runtime: node:22-alpine
# Volumes: /app/data (PostgreSQL backups)
```

### **Cloud Options**
- **Vercel:** Next.js apps + Edge Functions
- **Railway:** PostgreSQL + Fastify + Jobs
- **Kubernetes:** Helm charts for scaling
- **Cloudflare:** CDN + Workers (future)

---

## 📈 Performance

### **Frontend**
- Next.js 15 App Router (streaming, partial prerendering)
- React 19 Suspense + transitions
- TanStack Query v5 (caching, background sync)
- Code splitting by route
- CSS variables (no FOUC)

### **Backend**
- Fastify (lightweight, sub-ms routing)
- Connection pooling (pg-boss, BullMQ)
- Database query optimization (Drizzle)
- Redis caching (planned: ioredis)

### **Database**
- Indexes on frequently queried columns
- Partitioning for large tables (soci, comunicazioni)
- RLS policies optimized for tenant isolation
- pgvector indexing for AI embeddings (IVFFlat)

---

## 📚 Documentation

- **API Docs:** OpenAPI/Swagger (generated from tRPC)
- **Architecture:** `/docs/ARCHITECTURE.md`
- **Database:** `/docs/DATABASE.md`
- **Deployment:** `/docs/DEPLOYMENT.md`
- **Contributing:** `/CONTRIBUTING.md`

---

## 🧪 Testing

- **Unit:** Vitest for utilities, schemas
- **Integration:** API tests with supertest
- **E2E:** Playwright for frontend flows
- **Coverage Target:** >80% for core business logic

---

## 📦 Versioning & Release

- **Semver:** Major.Minor.Patch
- **Releases:** GitHub releases + changelog
- **CI/CD:** GitHub Actions (lint, test, build, deploy)
- **Docker Registry:** GitHub Container Registry (ghcr.io)

---

## 🎯 Roadmap (Future)

- [ ] Advanced RBAC (role templates, dynamic permissions)
- [ ] Data warehouse (BigQuery / ClickHouse for analytics)
- [ ] Mobile apps (React Native)
- [ ] Offline-first sync (WatermelonDB)
- [ ] WebRTC video calls (Jitsi / Daily.co)
- [ ] Multi-language i18n (next-intl)
- [ ] Webhook system (external integrations)
- [ ] Custom domain support (white-label)

---

**Ultimo aggiornamento:** 2026-04-17  
**Commit:** Latest on `claude/sports-saas-platform-Hb4ca`
