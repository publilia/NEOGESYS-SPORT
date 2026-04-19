# NEOGESYS · Domain Mapping

> Tabella di conversione fra la terminologia di dominio di
> **NEOGESYS SPORT** (il template source) e i verticali target.
> Questa è la "traduzione" che Claude Code deve applicare quando
> genera un nuovo NEOGESYS {{SECTOR}}.
>
> Ogni riga dice: "l'entità/ruolo/flusso `X` nel template diventa
> `Y` nel settore target". Entità che non esistono in un settore
> vanno rimosse; nuove entità settoriali vanno aggiunte come da
> `{{DATA_SHAPE_NOTES}}` del master prompt.

---

## 1. Entità core — mapping sector → domain

| Template (SPORT) | Medical | Education | Retail | Pharma | Legal | Hospitality |
|---|---|---|---|---|---|---|
| **socio** | paziente | studente | cliente | farmacia_cliente | cliente | ospite |
| **atleta** | paziente | studente | — | — | assistito | — |
| **istruttore** | medico | docente | venditore | farmacista | avvocato | receptionist |
| **coordinatore** | primario | coordinatore_didattico | store_manager | direttore_farmacia | partner_studio | direttore |
| **segreteria** | segreteria | segreteria_didattica | back_office | back_office | segreteria_studio | front_desk |
| **genitore** | caregiver | genitore | — | — | delegato | — |
| **tessera** | tessera_sanitaria | badge_studente | card_fedeltà | tessera_loyalty | tessera_ordine | key_card |
| **corso** | visita | corso/esame | — | — | pratica | soggiorno |
| **evento** | campagna_screening | gita/evento | promo | campagna | udienza | evento_struttura |
| **quota** | prestazione | retta | ordine | ricetta | parcella | prenotazione |
| **certificato_medico** | referto | certificato_medico | — | prescrizione | procura | — |
| **società** (tenant) | clinica | istituto | store | farmacia | studio_legale | struttura |

> Lo **slug di dominio** (URL + path) deve essere coerente con la
> terminologia del settore. Per SPORT: `/soci`, `/atleti`, `/corsi`.
> Per MEDICAL: `/pazienti`, `/visite`, `/referti`.

---

## 2. Ruoli utente — mapping

Ogni verticale DEVE avere i 3 ruoli core (`super_admin`, `admin_tenant`,
`contabile`). Oltre a questi, ruoli settoriali:

### SPORT (template)
```
super_admin, admin_tenant, coordinatore, istruttore,
segreteria, contabile, atleta, genitore
```

### MEDICAL
```
super_admin, admin_tenant, primario, medico, infermiere,
segreteria, contabile, paziente, caregiver
```

### EDUCATION
```
super_admin, admin_tenant, coordinatore_didattico, docente,
segreteria, contabile, studente, genitore
```

### RETAIL
```
super_admin, admin_tenant, store_manager, venditore,
magazziniere, contabile, cliente
```

### PHARMA
```
super_admin, admin_tenant, direttore_farmacia, farmacista,
magazziniere, contabile, farmacia_cliente
```

### LEGAL
```
super_admin, admin_tenant, partner_studio, avvocato,
paralegale, segreteria, contabile, cliente
```

### HOSPITALITY
```
super_admin, admin_tenant, direttore, receptionist, housekeeping,
maintenance, contabile, ospite
```

---

## 3. Flussi chiave — mapping

Un **flusso chiave** è un'interazione multi-step fra più entità
che rappresenta un caso d'uso primario del verticale. Ogni settore
ne ha 4–6 core.

### SPORT
1. Iscrizione socio → anagrafica + certificato medico + tessera + quota
2. Tesseramento federale → esport CSV ente federazione
3. Check-in corso → QR tessera → presenza
4. Scadenza certificato → notifica 30g prima → blocco accesso
5. Pagamento quota → Stripe/Nexi → ricevuta fiscale

### MEDICAL
1. Prenotazione visita → slot agenda + consenso informato + promemoria
2. Cartella clinica → referto + prescrizione + ricetta elettronica
3. Screening massivo → invito SMS/email → calendario → report
4. Fatturazione sanitaria → SSN + tessera sanitaria + detrazione
5. Consenso GDPR sanitario → firma digitale + storico

### EDUCATION
1. Iscrizione studente → anagrafica + retta + classe + genitore
2. Pagamento retta → rateizzazione + promemoria + ricevuta
3. Registro elettronico → presenze + voti + note + pagelle
4. Colloquio docenti → agenda + prenotazione + conferma
5. Gita scolastica → autorizzazione + pagamento + lista presenti

### RETAIL
1. Vendita scontrino → POS + stampa RT + giacenza aggiornata
2. Ordine fornitore → PO + ricezione merce + fattura
3. Inventario → conta + rettifiche + valorizzazione
4. Fidelity card → punti + promo + gift card
5. Resi & garanzie → pratica + credito + note accredito

### PHARMA
1. Dispensazione ricetta → lettura tessera sanitaria + DCB + tracciamento
2. Ordine grossista → multi-fornitore + urgenti + consegna
3. Scadenza lotti → notifica + sostituzione + resi
4. Servizi CUP → prenotazione ASL/SSN
5. Gestione turni → calendario + festivi + reperibilità

### LEGAL
1. Apertura pratica → cliente + controparte + materia + udienze
2. Fatturazione parcella → timesheet + imponibile + rinpens
3. Gestione scadenzario → udienze + deadline + preavvisi
4. Fascicolo digitale → PDF + metadati + fascicolo tel.
5. Incasso acconto → notifica + ricevuta + avanzamento

### HOSPITALITY
1. Prenotazione → disponibilità + pagamento + conferma + upsell
2. Check-in → anagrafica + police + chiave
3. Check-out → conto + feedback + fatturazione
4. Pulizie → assegnazione + stato stanza + rapporto
5. Manutenzione → ticket + intervento + chiusura

---

## 4. Campi anagrafici — diff per settore

### Template (SPORT) `soci` table
```sql
id uuid PK
tenant_id uuid FK
nome text
cognome text
codice_fiscale text
email text
telefono text
data_nascita date
-- sport-specific:
disciplina text                 -- calcio, nuoto, ...
tessera_federale text           -- numero tessera ente
certificato_medico_scadenza date
genitore_tutore_id uuid FK      -- se minore
```

### MEDICAL `pazienti` table
```sql
id uuid PK
tenant_id uuid FK
nome / cognome / codice_fiscale / email / telefono / data_nascita
-- medical-specific:
tessera_sanitaria text          -- TEAM TS
medico_curante text
gruppo_sanguigno text
allergie jsonb
patologie_croniche jsonb
caregiver_id uuid FK
```

### EDUCATION `studenti` table
```sql
id uuid PK
tenant_id uuid FK
nome / cognome / codice_fiscale / email / telefono / data_nascita
-- education-specific:
classe text
sezione text
anno_accademico text
genitore_tutore_id uuid FK
isee_fascia text
```

### RETAIL `clienti` table
```sql
id uuid PK
tenant_id uuid FK
nome / cognome / ragione_sociale / piva / email / telefono
-- retail-specific:
codice_cliente text
fidelity_card text
punti_accumulati int
listino text                    -- standard, premium, wholesale
```

### PHARMA `farmacia_clienti` table
```sql
id uuid PK
tenant_id uuid FK
-- come medical + campi commerciali:
codice_fidelity text
tessera_sanitaria text
allergie jsonb
terapie_croniche jsonb
```

### LEGAL `clienti` table
```sql
id uuid PK
tenant_id uuid FK
nome / ragione_sociale / piva / cf / email / telefono / pec
-- legal-specific:
tipo_cliente text               -- privato, azienda, ente
ordine_appartenenza text        -- se collega avvocato
```

### HOSPITALITY `ospiti` table
```sql
id uuid PK
tenant_id uuid FK
nome / cognome / documento_tipo / documento_numero
email / telefono / nazionalità
-- hospitality-specific:
preferenze jsonb                -- piano, vista, allergie alimentari
fidelity_level text             -- bronze, silver, gold
```

---

## 5. Non-funzionali cross-sector

Questi concetti restano **identici** in ogni verticale perché sono
piattaforma, non dominio:

| Entità | Path | Scope |
|---|---|---|
| `tenants` | `/tenants` | Platform |
| `billing` / `piani` | `/billing` | Platform |
| `fatture` | `/fatture` | Tenant + export per billing Platform |
| `audit_events` | `/audit` | Platform |
| `system_health` | `/system` | Platform |
| `impostazioni` | `/impostazioni` | Tenant |
| `palette` | `/impostazioni#branding` | Tenant |
| `integrazioni` | `/integrazioni` | Tenant |
| `comunicazioni` | `/comunicazioni` | Tenant |
| `documenti` | `/documenti` | Tenant |

**Non rinominare**: `tenants` resta `tenants` anche in MEDICAL,
EDUCATION, RETAIL. Il concetto "organizzazione con propri dati
isolati" è universale.

---

## 6. Applicazione del mapping

Quando Claude Code genera un nuovo verticale:

1. **Crea i file** con i nuovi nomi:
   - `apps/web/src/app/(dashboard)/pazienti/page.tsx` (non `soci`)
   - `apps/api/src/routers/pazienti.ts` (non `soci`)
   - `packages/db/src/schema/pazienti.ts`
   - `packages/schemas/src/pazienti.ts`

2. **Aggiorna le label UI** in italiano:
   - Sidebar: "Pazienti" non "Soci"
   - Page title: "Gestione pazienti" non "Gestione soci"
   - Button: "Nuovo paziente" non "Nuovo socio"

3. **Aggiorna il seed** con dati settoriali:
   - Nomi italiani plausibili + codici fiscali validi (libreria cf-utils)
   - Campi settore-specifici (tessera sanitaria per medical, classe per
     education, SKU per retail, …)

4. **Aggiorna i demo HTML**:
   - `demo/medico.html` invece di `demo/istruttore.html`
   - `demo/paziente.html` invece di `demo/atleta.html`

5. **Tradurre le i18n keys** (se i18n attivato):
   - Chiave canonica: `entity.member.title` → "Paziente"
   - NON creare chiavi sector-specific nelle stringhe UI
     (usa il mapping, altrimenti duplichi la tassonomia)

---

## 7. Verticali supportati (roadmap)

| Stato | Verticale | Slug repo | Variabile settore |
|---|---|---|---|
| ✅ Alpha | Sport | `neogesys-sport` | `SPORT` |
| 🟡 Spec | Medical | `neogesys-medical` | `MEDICAL` |
| ⬜ Planned | Education | `neogesys-education` | `EDUCATION` |
| ⬜ Planned | Retail | `neogesys-retail` | `RETAIL` |
| ⬜ Planned | Pharma | `neogesys-pharma` | `PHARMA` |
| ⬜ Planned | Legal | `neogesys-legal` | `LEGAL` |
| ⬜ Planned | Hospitality | `neogesys-hospitality` | `HOSPITALITY` |
| ⬜ Ipotesi | Real Estate | `neogesys-realestate` | `REALESTATE` |
| ⬜ Ipotesi | Professional | `neogesys-professional` | `PROFESSIONAL` |

> **Linea guida**: prima di aprire un nuovo verticale, compilare
> `05-competitive-analysis-template.md` per quel settore. Se non
> trovi 20+ competitor, il settore è troppo di nicchia per un SaaS
> generalista — valuta se è davvero un verticale o solo una feature
> di un verticale esistente.
