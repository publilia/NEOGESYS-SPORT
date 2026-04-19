# PROMPT META — NEOGESYS Gestionale Modulare

Questo documento è il **prompt master** per generare un nuovo gestionale della
suite NEOGESYS (es. NEOGESYS-SPORT, NEOGESYS-PROLOCO, NEOGESYS-FARMACIE,
NEOGESYS-CENTRI-ESTETICI, NEOGESYS-HR, NEOGESYS-CRM, ecc.).

Incolla il prompt in una nuova chat Claude Code indicando il **verticale**
(sport, proloco, farmacie, estetica, hr, crm, …) e il **nome legale** del
nuovo gestionale.

---

## STEP 0 — Ricerca di mercato obbligatoria

**Prima di scrivere una singola riga di codice, effettua una ricerca approfondita
del mercato** per il verticale richiesto:

- **≥ 20 competitor reali** tra USA, Unione Europea e Italia.
- Per ciascuno raccogli: nome, sito web, modello di pricing, feature chiave,
  punti di forza, punti deboli, integrazioni native, stack tecnico noto.
- Segmenta per tipologia (SaaS cloud multi-tenant, on-premise, enterprise,
  low-code, verticali regolamentati).
- Produci un report `market-research/YYYY-MM-<vertical>.md` con:
  - Executive summary (≤ 500 parole).
  - Matrice feature (rows = feature, cols = competitor, valori = ✅ / ⚠️ / ❌).
  - Pricing comparison table (piano entry, pro, enterprise, per-seat vs flat).
  - SWOT per posizionare NEOGESYS.
  - 5–10 **feature killer** che differenziano NEOGESYS.
  - Integrazioni must-have per il verticale.

Il PR di apertura del gestionale deve includere questo report, altrimenti
non è mergeable.

---

## STEP 1 — Identità del gestionale

| Campo | Esempio sport | Formato |
|-------|---------------|---------|
| ID verticale | `sport` | slug minuscolo |
| Nome prodotto | `NEOGESYS Sport` | Title Case |
| Monorepo dir | `NEOGESYS-SPORT` | SCREAMING-KEBAB |
| Database name | `neogesys_sport` | `neogesys_<vertical>` (sempre) |
| Dominio | `sport.neogesys.app` | `<vertical>.neogesys.app` |
| Colore primario di default | HSL del brand verticale | — |

La **nomenclatura del DB deve sempre essere identificabile**: mai `maindb`,
`production`, `app` — sempre `neogesys_<vertical>` per evitare mix tra
istanze di gestionali diversi sulla stessa macchina di sviluppo.

---

## STEP 2 — Stack tecnologico (comune a tutta la suite)

- **Monorepo**: pnpm 9 + Turborepo 2
- **Frontend**: Next.js 15 (App Router, RSC, Turbopack), React 19, TypeScript strict
- **API**: Fastify 5 + tRPC 11
- **DB**: PostgreSQL 16 + `pgvector` (embeddings) + Drizzle ORM 0.38
- **Cache/queue**: Redis 7 + BullMQ
- **Storage**: MinIO (S3-compatible, locale) + S3 reale in produzione
- **AI**: Anthropic Claude 4.5 (prima scelta), OpenAI GPT-4o (fallback), pgvector per RAG
- **Auth**: sessione server + multi-tenant header `x-dev-tenant-slug` in dev
- **Container**: Docker Compose (web + api + admin + postgres + redis + minio)
- **UI**: design system condiviso (file `globals.css` con CSS variables HSL),
  nessuna libreria UI pesante — componenti custom leggeri.
- **Charts**: Recharts
- **PDF**: @react-pdf/renderer per documenti brandizzati

Tutti i gestionali condividono lo stesso **template UI** (header + sidebar +
card + badge + tabelle + modal), lo stesso **sistema di palette** (8 temi
inclusa "Pulsar Star"), lo stesso **Quasar menu** e le stesse **integrazioni**.

---

## STEP 3 — Moduli di base sempre presenti

Ogni gestionale NEOGESYS, indipendentemente dal verticale, deve includere:

### Infrastruttura
- Multi-tenancy (schema tenant isolation + super_admin platform view).
- RBAC gerarchico: `super_admin` > `admin_tenant` > `coordinatore` > `operatore`
  > ruoli verticali specifici > `user`.
- Audit log immutabile per ogni azione `super_admin`.
- Dev Dashboard (obbligatoria): **deve essere prodotta e mantenuta** con
  metriche live dev-only (DB rows, Redis cache, ultimi errori, ultimo deploy,
  build-time, code quality).
- Impersonation super_admin → tenant (con tracking audit).

### UI/UX condivisa
- Header: logo + nome gestionale + tenant + ruolo + search ⌘K + notifiche +
  messaggi + palette + theme toggle + **Quasar menu** + profilo.
- Sidebar: sezione "Piattaforma" (solo super_admin) + "Gestione" (tenant-level)
  + **"Ecosistema NEOGESYS"** (cross-gestionale, vedi step 8) + "AI Assistente".
- Ogni pagina ha: `page-header` + info-banner contestuale + filters-bar +
  card principale + EmptyState standardizzato + modal CRUD.
- Palette **Pulsar Star** (tema speciale) con animazioni cosmiche (stelle,
  nebulosa, shimmer proton/quark, pulsing quasar glow).

### Dashboard role-aware (obbligatoria)
La dashboard "/" deve essere **personalizzata per ruolo** con importanza
contestuale:
- `super_admin` → metriche cross-tenant, MRR, churn, system health.
- `admin_tenant` → KPI tenant (soci/clienti attivi, fatturato, scadenze).
- `coordinatore` → attività del giorno, task assegnati, calendario team.
- `operatore` → coda di lavoro quotidiana (email da inviare, pratiche aperte).
- `tesoriere` → cash flow, scadenzario, fatture insolute.
- `user`/`socio`/`cliente` → le proprie pratiche, documenti, comunicazioni,
  tessera digitale, pagamenti.

Non esiste mai una "dashboard generica" uguale per tutti.

### Tessera / Card digitale (se applicabile al verticale)
- Ogni soggetto (socio, cliente, paziente) ha un **codice univoco** e una
  **tessera digitale con QR code** mostrabile da mobile.
- Il QR rimanda a `/verifica-tessera?t=<tenantSlug>&c=<codice>&s=<id>`:
  pagina pubblica GDPR-safe che mostra solo stato, nome, tipologia,
  foto (se consensi lo permettono).
- Download PNG + share via `navigator.share`.
- Procedura tRPC **pubblica** `verifica.verifyTessera` (no auth).

### Integrazioni cloud (sempre disponibili)
- **Google Drive** (upload documenti, import allegati)
- **Google Calendar** (sync eventi del gestionale ↔ calendar personale)
- **Microsoft OneDrive** (storage alternativo)
- **Microsoft Outlook Calendar** (sync bidirezionale)
- **Microsoft 365 / Office 365** (embed documenti, editing inline)
- OAuth tenant-level + per-user token con refresh automatico.
- UI `/integrazioni` con stato live di ogni provider.

### Document generation brandizzato (sempre disponibile)
- Ogni gestionale genera **PDF brandizzati** con logo tenant, colori palette
  custom, header/footer configurabili.
- Template: report periodici, analisi, certificati, quote/fatture, attestati,
  privacy policy. Nuovi template plugin-abili da `packages/documents/templates/`.
- Export CSV/Excel/PDF per ogni tabella; export PDF analitico con grafici per
  ogni dashboard.

### AI Assistant (obbligatorio)
- Drawer laterale ⌘J con assistant Claude sul contesto del gestionale.
- RAG su dati tenant via embeddings pgvector.
- Tool use verso le tRPC mutation (con conferma utente).
- Crediti AI per tenant con bar nel Quasar menu.

### Comunicazioni (obbligatorio)
- Email transazionali + bulk (MJML + Nodemailer/SendGrid).
- WhatsApp Business API opzionale.
- SMS opzionale.
- Template per verticale.

---

## STEP 4 — Moduli per verticale

Adatta questi moduli allo specifico dominio:

### Sport (ASD / SSD)
Soci, atleti, certificati medici, corsi, iscrizioni, presenze, eventi,
gare, tesseramenti federali, quote, contabilità, documenti GDPR, consensi.

### Proloco
Eventi territoriali, sagre, volontari, tesseramenti, sponsor, patrocini,
banchi, attrezzature, certificazioni RSPP/HACCP, rendicontazione comunale.

### Farmacie
Magazzino farmaci, ricette (SSN + ricetta bianca), tariffazione, DCR/DCB,
clienti fidelity, promemoria terapie, consegne a domicilio, scadenze lotti,
ordini ai grossisti (integrazione ordinativi).

### Centri estetici
Clienti + schede trattamenti, prenotazioni, operatori, commissioni, consumi
prodotti, abbonamenti, pacchetti, fidelity, cross-sell, consensi estetici.

### HR & Payroll
Dipendenti, contratti, presenze, ferie/permessi, buste paga, CU, 730,
costi orari, centri di costo.

### CRM Marketing
Lead, deal pipeline, campagne, automation, landing, A/B test, SEO tools.

Ogni modulo verticale condivide lo stesso **template UI** e la stessa
**API pattern** (tRPC router + Drizzle schema + Zod input + pagination +
filtri + ordinamento + ricerca full-text + export CSV).

---

## STEP 5 — Palette "Pulsar Star" (tema speciale obbligatorio)

Ogni gestionale espone **8 palette** condivise (default, ocean, forest, sunset,
monochrome, vibrant, corporate, sport) **+ 1 palette speciale "Pulsar Star"**
con:
- Primary violet cosmico `272 82% 58%` (light) / `272 92% 70%` (dark).
- Accent pulsar pink `328 86% 60%`.
- Background deep space `260 60% 5%` in dark mode.
- Animazioni CSS keyframe:
  - `pulsar-nebula-drift` (24s) — nebulose sul background.
  - `pulsar-twinkle` (6s) — stelle scintillanti (`body::after`).
  - `pulsar-ring` (3s) — anello di luce sui btn-primary.
  - `pulsar-shimmer` (2.5s) — proton/quark spin sugli active nav-item.
  - `pulsar-float` (6s) — tessere che fluttuano nello spazio.
  - `quasar-pulse` (2.4s) — glow sul Quasar button.
- `body::before` + `body::after` con radial-gradient stellari.

---

## STEP 6 — Quasar menu (obbligatorio nell'header)

Bottone tondo pulsante accanto al profilo utente, con gradient quasar
violetto/magenta. Apre un popover (22 rem) che contiene:
1. **Hero piano attivo** con bottone "Upgrade piano".
2. **Crediti AI** usati/limite con barra progresso gradient.
3. **Stato sistema** live: API, PostgreSQL, MinIO, Redis (con ms latenza).
4. **Aggiornamenti**: check manuale + toggle aggiornamenti automatici + versione.
5. **Stack tecnologico**: badge monospace con le principali dipendenze.
6. **Assistenza / ticket**.
7. **Integrazioni connesse** → `/integrazioni`.
8. **Info gestionale & licenza**.
9. **Changelog & novità**.

---

## STEP 7 — Ecosistema NEOGESYS (cross-gestionale)

Dopo la sezione "Gestione" nella sidebar, mostrare per i ruoli `super_admin`,
`admin_tenant` e `coordinatore` un divisore e una sezione
**"Ecosistema NEOGESYS"** con i collegamenti agli altri gestionali della
suite installati per lo stesso tenant:
- CRM Marketing → `https://crm.neogesys.app`
- Proloco → `https://proloco.neogesys.app`
- Farmacie → `https://farmacie.neogesys.app`
- Centri Estetici → `https://estetica.neogesys.app`
- HR & Payroll → `https://hr.neogesys.app`

Ogni voce è `target="_blank"` con badge "on" (verde) se il modulo è
installato per il tenant, altrimenti icona `ExternalLink` a 50% opacity.

Il **single sign-on** avviene via cookie di sessione condiviso sul dominio
root `neogesys.app` — l'utente non deve autenticarsi di nuovo.

---

## STEP 8 — Verticale + Testing + Docs

- **Test**: Vitest + Playwright E2E per ogni CRUD principale, ≥ 70% coverage.
- **Docs**: per ogni modulo un `docs/<modulo>.md` con flow, schema DB,
  tRPC endpoints, screenshots.
- **Changelog**: `CHANGELOG.md` con SemVer e data release.
- **CI**: GitHub Actions con typecheck + lint + test + docker build.

---

## STEP 9 — Direttiva operativa

1. `PROCEDI e non ti interrompere`. Testa ogni sezione.
2. Avvisa l'utente **solo a sviluppo completo**.
3. Ogni sezione deve essere **navigabile e funzionante** (niente stub `TODO`).
4. Se una feature non è applicabile al verticale, rimuoverla esplicitamente
   dalla sidebar e dai permessi — non lasciarla come 404.
5. Il DB deve essere popolato da un seed realistico (≥ 50 soggetti, ≥ 10
   operazioni per modulo) per poter validare la UI in dev.
6. Commit convenzionali, PR piccole con changelog.

---

**Fine del meta-prompt.** Il gestionale risultante deve essere pronto per
andare in produzione il giorno stesso — niente mock, niente placeholder.
