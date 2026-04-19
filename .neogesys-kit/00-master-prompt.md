# NEOGESYS · Master Prompt (multi-sector)

> **Scopo**: singolo prompt "chiavi in mano" per generare una nuova
> istanza della suite NEOGESYS su un verticale diverso (medical,
> education, retail, pharma, legal, real estate, hospitality, …).
> Il prompt viene letto da **Claude Design** (per la UI/brand)
> e **Claude Code** (per il codice) insieme ai 5 file di supporto
> (`01` → `05`). Se un file è mancante, il prompt non è valido.

---

## Versione corrente del source

| Campo | Valore |
|---|---|
| Versione | **2026.4.1** (CalVer `YYYY.M.PATCH`) |
| Release | 2026-04-19, 15:00 UTC |
| Brand set | Logo quasar definitivo consegnato 2026-04-19 (neogesys-mark / horizontal / vertical / wordmark + varianti negative) |
| Regola d'oro | *"ricorda sempre aggiorna il prompt"* — ogni modifica al source aggiorna questo file per tenerlo sincronizzato con la realtà del repo |

### Cronologia modifiche rilevanti per il generatore

- **2026.4.1 · 2026-04-19** — Set logo definitivo (neogesys-mark.svg,
  neogesys-logo-horizontal.svg, neogesys-logo-vertical.svg,
  neogesys-wordmark.svg + varianti negative) consegnato da Claude Design.
  TSX components aggiornati: `NeogesysLogoHorizontal` (compact, senza
  tagline) + nuovo `NeogesysLogoFull` (con tagline "Universal Suite") +
  nuovo `NeogesysWordmark` (solo testo). Logo iniettato nella login page
  web + portale-socio. Demo HTML di tutti i 9 ruoli riscritte con il
  nuovo layout `.logo-horizontal-wrap` + `.logo-sector` (SPORT pill).
- **2026.4.1 · 2026-04-19** — Release datetime (`APP_RELEASE_DATETIME`
  ISO 8601 UTC) aggiunto accanto al semplice `APP_RELEASE_DATE` in
  `apps/web/src/lib/version.ts` e `apps/api/src/lib/version.ts`, con
  helper `formatReleaseDateTime()` → `"19 aprile 2026, 15:00 UTC"`.
  Propagato a: QuasarMenu, Sidebar footer, login page, dev-index.html
  badge, demo HTML footer, Dev Dashboard header.
- **2026.4.1 · 2026-04-19** — Piani abbonamento: 5 tier canonici
  (trial 50 soci / 3 utenti, free 20/1, base 200/5, pro 2000/25,
  enterprise ∞/∞). Super admin CRUD sui piani via `/billing` con
  `PianiManager` component + tRPC `piattaforma.piani.{listAll,create,
  update,disable}`. Tenant admin può self-upgrade via
  `/impostazioni/piano` + tRPC `tenant.requestPlanChange` (adminProcedure
  middleware, audit log automatico su `superAdminAuditLog`).
- **Pre 2026.4.1** — Quasar mark originale, wordmark disegnato a mano,
  sidebar footer con solo versione, piani hardcoded. Tutto sostituito.

---

## Come si usa

1. Copia il blocco `=== PROMPT ===` qui sotto
2. Sostituisci le variabili `{{…}}` con i valori del nuovo verticale
3. Incolla come **primo messaggio** a Claude (Design o Code)
4. Allega i file `01-tech-stack-lock.md`, `02-design-system.md`,
   `03-architecture-patterns.md`, `04-domain-mapping.md`,
   `05-competitive-analysis-template.md`
5. Attendi: il primo output sarà la **competitive analysis**
   (non il codice). Approvala, poi procedi allo scaffolding.

---

## Variabili

| Nome | Esempio (Sport) | Esempio (Medical) | Esempio (Retail) |
|---|---|---|---|
| `{{SECTOR_UPPER}}` | `SPORT` | `MEDICAL` | `RETAIL` |
| `{{SECTOR_LABEL}}` | `Sport` | `Medical` | `Retail` |
| `{{SECTOR_ITA}}` | `sportivo` | `medico` | `retail` |
| `{{PRIMARY_ENTITY}}` | `socio` | `paziente` | `cliente` |
| `{{PRIMARY_ENTITY_PLURAL}}` | `soci` | `pazienti` | `clienti` |
| `{{USER_ROLES[]}}` | super_admin, admin_tenant, coordinatore, istruttore, segreteria, contabile, atleta, genitore | super_admin, admin_tenant, medico, infermiere, segreteria, contabile, paziente | super_admin, admin_tenant, store_manager, venditore, magazziniere, contabile, cliente |
| `{{KEY_FLOWS[]}}` | iscrizione socio, emissione quota, tesseramento federale, check-in corso, certificato medico in scadenza | prenotazione visita, cartella clinica, prescrizione, fatturazione sanitaria, consenso informato | vendita scontrino, gestione giacenze, ordini fornitore, fidelity, scontrini elettronici |
| `{{COMPETITORS[]}}` | TeamSnap, SportyHQ, Spond, PlaySportsNet, MySport, WodifyApp, Mindbody, BookingPress, Gymdesk, ClubSpot | Doctolib, TeamSystem Medicina, CGM, Dedalus, HealthKit, Epic, Doxy.me, SimplePractice, Kareo, AdvancedMD | Retail Pro, Lightspeed Retail, Square for Retail, TS Retail, Vend, ShopKeep, Miss Tipsi, Wolters TS, Zucchetti Retail |
| `{{DATA_SHAPE_NOTES}}` | certificato medico con scadenza, tessera regionale+federale, genitore tutore per minori | prescrizione elettronica, ricetta ripetibile/non, campi anagrafici PID, tessera sanitaria | EAN/SKU prodotto, giacenza multi-store, IVA rider |

> **Importante**: *tutto ciò che non è nella tabella deve rimanere identico
> a NEOGESYS {{SECTOR_UPPER}}*. Il brand, la UI, lo stack, il multi-tenant,
> l'RBAC, l'impersonation, il QuasarMenu, il TenantMenu, la palette
> cosmica, il logo quasar — non si toccano.

---

=== PROMPT ===

Sei l'assistente che genera **NEOGESYS {{SECTOR_UPPER}}**, il gestionale
SaaS multi-tenant per il settore {{SECTOR_ITA}}. NEOGESYS è una suite:
il nome è fisso, il settore (`{{SECTOR_UPPER}}`) è la variabile.

## Fase 1 — Competitive analysis (obbligatoria, prima del codice)

Analizza **almeno 20 gestionali SaaS** usati oggi nel settore
{{SECTOR_ITA}}. Include come punto di partenza questi:
{{COMPETITORS[]}}. Aggiungine altri 10+ di tua conoscenza
(italiani, europei, statunitensi — almeno 3 per area).

Per ciascuno, estrai:
- Feature core (elenco tassonomico, 8–15 voci per prodotto)
- Pricing model (freemium, seats, flat, consumption)
- Stack osservabile (framework UI, hosting, auth)
- Differenziatori rispetto alla concorrenza
- Lacune ricorrenti (cose che manca a tutti e 20)

Compila `05-competitive-analysis-template.md` (vedi file allegato).
**Non scrivere codice in questa fase.** Consegna al human la matrix
completa e chiedi approvazione prima di passare alla Fase 2.

## Fase 2 — Feature spec di NEOGESYS {{SECTOR_UPPER}}

Dalla matrix estrai le 20–30 feature core. Per ciascuna:
- Nome in italiano (es. "Iscrizione {{PRIMARY_ENTITY}}")
- Entità di dominio coinvolte (riferisci a `04-domain-mapping.md`)
- Ruoli che la usano (riferisci a `{{USER_ROLES[]}}`)
- Route `/api/*` e `/pagina` corrispondenti
- Se copia 1:1 da NEOGESYS SPORT (indica il path) o nuova

Flussi chiave che DEVONO esistere: {{KEY_FLOWS[]}}.

## Fase 3 — Stack lock

Leggi `01-tech-stack-lock.md`. Usa **solo** quelle versioni e quelle
librerie. **Non sostituire** alternative per nessun motivo, nemmeno
"perché più moderne/semplici". Se una feature richiede una dipendenza
non in lista, chiedi al human prima di aggiungerla.

## Fase 4 — Design system

Leggi `02-design-system.md`. La UI/UX è il brand NEOGESYS — va
replicata **pixel-perfect**:
- Palette cosmica (Starlight #FFF6D9, Pulsar Violet #8B3FE5,
  Pulsar Magenta #ED3F9E, Cosmic Cyan #3BD0F2, Cosmic Night #13102A)
- Logo set ufficiale 2026-04-19 in `/public/brand/`:
  - `neogesys-mark.svg` (32×32) — quasar full color, favicon
  - `neogesys-mark-minimal.svg` (32×32) — currentColor, QuasarMenu
  - `neogesys-logo-horizontal.svg` (260×48) — full con "Universal Suite"
  - `neogesys-logo-vertical.svg` (240×128) — splash / square cards
  - `neogesys-wordmark.svg` (260×54) — solo testo
  - Varianti `*-negative.svg` per fondi scuri
- Componenti React in `apps/web/src/components/brand/neogesys-mark.tsx`:
  - `NeogesysMark`, `NeogesysMarkMinimal`, `NeogesysLogoHorizontal`
    (compact, header), `NeogesysLogoFull` (con tagline, splash/login),
    `NeogesysWordmark` (solo testo)
- AppHeader layout: `.logo-horizontal-wrap` (pill cosmica #13102A con
  glow magenta) contiene `NeogesysLogoHorizontal`, seguito da
  `.logo-sector` pill gradient viola→magenta con `{{SECTOR_UPPER}}`
- Login page: `NeogesysLogoFull` dentro un cosmic panel a 48px di
  altezza (tagline leggibile) + sector pill sotto
- Quasar mark animata nel QuasarMenu (top-right) che pulsa sempre
- Componenti: AppHeader, Sidebar, TopNav, QuasarMenu, TenantMenu,
  Cards, Badges, Buttons, Forms, PaletteSelector, ThemeToggle
- Animazioni: `quasar-pulse` 2.4s + `prefers-reduced-motion` fallback
- Tipografia: ereditata da tailwind + CSS variables tema
- Versione release esposta in: QuasarMenu (blocco aggiornamenti),
  Sidebar footer (badge `v{APP_VERSION}` + tooltip
  `formatReleaseDateTime()`), login page footer monospace

Se la versione del brand non è coerente con il file, **chiedi conferma**
prima di generare.

## Fase 5 — Architecture & multi-tenancy

Leggi `03-architecture-patterns.md`. Replica esattamente:
- Next 15.1 App Router, tre apps (web/api/admin) in un pnpm workspace
- tRPC 11 con 4 procedure types (public, protected, admin, superAdmin)
- Drizzle ORM + PostgreSQL + Redis + MinIO
- Header `x-dev-tenant-slug` per tenant resolution
- Zustand persisted `useCurrentUser` con 8+ utenti demo
- Super admin con "NEOGESYS Platform" context + impersonation
- Layout guard `PlatformContextEmpty` per rotte tenant-scoped
- **Piani abbonamento** (5 tier canonici, schema `planiAbbonamento`):
  trial (50 soci / 3 utenti), free (20/1), base (200/5),
  pro (2000/25, highlighted), enterprise (∞/∞). Super admin gestisce
  i prezzi/feature tramite `PianiManager` component in `/billing`
  (web app) con tRPC `piattaforma.piani.{listAll, create, update,
  disable}`. Tenant admin fa self-upgrade via `/impostazioni/piano`
  con tRPC `tenant.requestPlanChange` (middleware `adminProcedure`,
  audit log su `superAdminAuditLog` con azione `tenant.self_plan_change`).
- **Versioning**: `apps/web/src/lib/version.ts` + `apps/api/src/lib/version.ts`
  esportano `APP_VERSION` (CalVer), `APP_RELEASE_DATE`,
  `APP_RELEASE_TIME`, `APP_RELEASE_DATETIME` (ISO 8601 UTC) e
  `formatReleaseDateTime()` → "19 aprile 2026, 15:00 UTC".
  Override via env `NEXT_PUBLIC_APP_VERSION` / `NEXT_PUBLIC_BUILD_TIME`
  per deploy canary. Lo script `scripts/release.mjs` riallinea VERSION
  + CHANGELOG + i due file `version.ts`.

## Fase 6 — Domain mapping

Leggi `04-domain-mapping.md`. Sostituisci in modo consistente:
- `socio` → `{{PRIMARY_ENTITY}}` ovunque (code, i18n, URL, API)
- `soci` → `{{PRIMARY_ENTITY_PLURAL}}`
- Ruoli da `{{USER_ROLES[]}}`
- Campi anagrafici specifici da `{{DATA_SHAPE_NOTES}}`

Mantieni invariati: tenant, piano, billing, audit, system health,
impostazioni, palette — sono concetti piattaforma, non di dominio.

## Fase 7 — Demo HTML + seed data

Genera 8+ file HTML demo (uno per ruolo in `{{USER_ROLES[]}}`) con
layout identico a `/demo/*.html` di NEOGESYS SPORT ma con dati
realistici del settore {{SECTOR_ITA}}.

Seed DB con almeno 20 {{PRIMARY_ENTITY_PLURAL}} fittizi + flussi
demo (es. iscrizioni, pagamenti, scadenze).

## Output atteso

1. `05-competitive-analysis-template.md` compilato (Fase 1)
2. Feature spec (Fase 2)
3. Repo `NEOGESYS-{{SECTOR_UPPER}}` completo (Fase 3–7)
4. README con istruzioni docker-compose up
5. Checklist delle 20+ feature con status ✅/⚠️/❌

## Regole ferree

- **MAI** inventare feature che non esistono in almeno 3 competitor
  (altrimenti è scope creep, non core)
- **MAI** cambiare lo stack
- **MAI** cambiare il brand
- **SEMPRE** chiedere al human dopo ogni fase, non proseguire in autonomo
- **SEMPRE** citare il competitor quando importi una feature
  ("ispirato a TeamSnap · gestione squadre")

=== FINE PROMPT ===

---

## Checklist pre-lancio

Prima di dire "fatto", il verticale generato deve avere:

- [ ] Matrix 20+ competitor compilata in `05-…`.md
- [ ] Tutte le 20+ feature mappate a pattern esistenti o giustificate
- [ ] `docker-compose up` → 3 app online (web, api, admin)
- [ ] Super admin può switchare tenant via impersonation
- [ ] Logo header mostra `NeogesysLogoHorizontal` compact + `{{SECTOR_UPPER}}` pill
- [ ] Login page mostra `NeogesysLogoFull` con tagline leggibile +
      sector pill + footer monospace con v{version} · release datetime
- [ ] QuasarMenu pulsante ☉ pulsa in alto a destra (quasar minimal dentro
      + alone esterno, entrambi 2.4s in fase)
- [ ] QuasarMenu "Aggiornamenti" mostra `APP_VERSION` + `APP_RELEASE_DATE`
      + `APP_RELEASE_TIME`
- [ ] Sidebar footer mostra `v{APP_VERSION}` + tooltip
      `formatReleaseDateTime()` + "dev" channel badge
- [ ] Palette cosmica invariata (test colori su `/impostazioni#branding`)
- [ ] Layout guard: super_admin + Platform context + rotta tenant-scoped → PlatformContextEmpty
- [ ] 8+ demo HTML, uno per ruolo in `{{USER_ROLES[]}}`, con il nuovo
      `.logo-horizontal-wrap` + pill sector
- [ ] Seed DB con 20+ `{{PRIMARY_ENTITY_PLURAL}}` fittizi
- [ ] 5 piani abbonamento seeded (trial, free, base, pro, enterprise)
      visibili dal super admin in `/billing` (CRUD) e dal tenant admin
      in `/impostazioni/piano` (self-upgrade)
- [ ] Typecheck clean (`tsc --noEmit` su tutte e 3 le apps + portale-socio)
- [ ] Nessun path HTTP 404 per rotte navigabili da sidebar/topnav
