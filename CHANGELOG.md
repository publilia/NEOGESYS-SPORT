# NEOGESYS Sport · Changelog

Scala di versionamento: **CalVer `YYYY.M.PATCH`**.
- `YYYY` anno del rilascio
- `M` mese del rilascio minor (feature)
- `PATCH` incrementale per hotfix/patch dello stesso mese

Tipo delle voci (Keep a Changelog):
- **Added** nuove funzionalità
- **Changed** cambiamenti in funzionalità esistenti
- **Deprecated** funzionalità in procinto di rimozione
- **Removed** funzionalità rimosse
- **Fixed** bug fix
- **Security** correzioni di sicurezza
- **DX** esperienza sviluppatori / infrastruttura

Ogni release è anche un git tag `v<VERSION>` e un'entry della tabella
`superAdminAuditLog` con `azione = "release.deploy"`.

---

## [Unreleased]

### Added
- Versionamento CalVer esposto in UI (Quasar Menu → aggiornamenti) e via
  `trpc.ecosystem.getManifest` (campo `version`).
- Script `pnpm release` per bump VERSION + changelog + tag git.

---

## [2026.4.1] · 2026-04-19

### Added
- **Ecosistema NEOGESYS API** (`trpc.ecosystem.*`) — contratto pubblico per
  interoperabilità tra gestionali della suite (Sport, CRM, Proloco, Farmacie,
  Estetica, HR): `getManifest`, `listApps`, `listInstalled`, `registerApp`,
  `unregisterApp`, `issueSsoToken`, `verifySsoToken`. Token SSO stateless
  HMAC-SHA256, TTL 60s.
- **TenantMenu** header dropdown: info tenant + piano + countdown trial per
  ruoli tenant; switcher impersonation per super_admin.
- **Pulsar Star palette** con animazioni cosmiche (nebula drift, twinkle,
  ring, shimmer, float, quasar-pulse).
- **Quasar Menu** in header (a destra dell'avatar): crediti AI, piano
  attivo, stato sistema (API/DB/MinIO/Redis), aggiornamenti, stack
  tecnologico, assistenza, changelog.
- **Tessera digitale** con QR code e pagina pubblica `/verifica-tessera`
  (nessuna autenticazione, GDPR-safe).
- **PROMPT-META-GESTIONALE.md** — blueprint riproducibile per generare
  nuovi gestionali NEOGESYS, con obbligo di ricerca di mercato (≥20
  competitor USA/EU/IT) e dashboard role-aware.

### Changed
- Header: la vecchia label statica "tenant · ruolo" è stata sostituita dal
  nuovo TenantMenu dropdown.
- QuasarMenu spostato a destra dell'avatar utente.

### Removed
- Blocco "Ecosistema NEOGESYS" hardcoded nella sidebar di Sport. Ora è
  renderizzato dinamicamente SOLO se almeno un altro gestionale della suite
  è installato per il tenant corrente (data-source `trpc.ecosystem.listInstalled`).

### Security
- La verifica pubblica tessera non espone email, codice fiscale o
  documenti: restituisce SOLO i campi strettamente necessari (nome, cognome,
  tipologia, stato, data iscrizione, codice tessera).

### DX
- Versionamento CalVer con VERSION file al root.
- `scripts/release.mjs` per automatizzare bump e changelog.
- Typecheck clean cross-workspace (web, api, admin, portale-socio, db,
  integrations, ai).

---

## [2026.3.0] · 2026-03-30

### Added
- Dashboard role-aware con layout differenziato per ruolo (super_admin,
  admin_tenant, coordinatore, operatore, tesoriere, istruttore, user).
- Integrazioni cloud: Google Drive, Google Calendar, Microsoft 365,
  OneDrive, Outlook Calendar.
- AI Assistant con embedding pgvector per ricerca semantica soci.
- Generazione PDF brandizzati per tessere, ricevute, report.

### Changed
- Unified palette system con 8 temi predefiniti + tema custom per tenant.

---

## [2026.2.0] · 2026-02-15

### Added
- Multi-tenancy completo con isolamento per `tenantId` su ogni tabella.
- RBAC con 7 ruoli gerarchici (super_admin → user).
- Audit log separato per super_admin (`superAdminAuditLog`) e tenant
  (`auditLog`).
- Dev Dashboard per sviluppo multi-ruolo senza auth reale.

---

## [2026.1.0] · 2026-01-10

### Added
- Primo MVP: soci, corsi, quote, eventi, certificati medici, comunicazioni.
- Stack: Next.js 15.1 + Fastify 5.2 + tRPC 11 + Drizzle 0.38 + PostgreSQL
  16 + pgvector + Redis 7 + MinIO.
- Docker Compose per dev environment completo.
