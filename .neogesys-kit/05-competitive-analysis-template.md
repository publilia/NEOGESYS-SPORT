# NEOGESYS · Competitive Analysis (Template)

> **Obbligatorio da compilare** prima di iniziare lo scaffolding di
> un nuovo verticale. Lo compila **Claude Design** o **Claude Code**
> quando riceve il master prompt con variabili settoriali risolte.
>
> Lo scopo è **scoprire** cosa costituisce il "gestionale standard"
> del settore target — non inventare, non copiare random. Solo
> feature che esistono in almeno 3 competitor su 20+ entrano nel
> backlog di NEOGESYS {{SECTOR}}.

---

## Istruzioni per chi compila

1. Sostituisci `{{SECTOR_ITA}}` con il settore target (es. "medico")
2. Elenca **almeno 20 gestionali SaaS** attivi in quel mercato
   (italiani + europei + USA). Se non arrivi a 20, il settore è
   troppo di nicchia → discuti con il human prima di proseguire.
3. Per ciascun competitor, estrai feature di dominio (**non** feature
   di piattaforma comuni tipo "dark mode", "export Excel")
4. Compila la **matrix** (§3): righe = feature, colonne = competitor
5. Per ogni feature segna il competitor che la offre (✅ = presente,
   ⚠️ = limitata, ⬜ = non presente, ❓ = non verificabile)
6. Ordina le feature per numero di ✅ → le "core" sono quelle
   con ≥ 60% presenza (12+ su 20)
7. Feature con 30–60% presenza → **differenzianti**, decidere caso
   per caso se includerle
8. Feature < 30% → **out of scope**, non includere

---

## 1. Settore target

- **Settore**: {{SECTOR_ITA}} ({{SECTOR_UPPER}})
- **Data analisi**: {{DATE}}
- **Fonte metrics**: siti ufficiali, recensioni G2/Capterra, demo tour

---

## 2. Competitor analizzati

> Minimo 20. Idealmente 25–30. Copri 3 aree (🇮🇹 ITA, 🇪🇺 EU, 🇺🇸 USA).

| # | Nome | Area | URL | Pricing model | Stack osservabile | Note |
|---|---|---|---|---|---|---|
| 1 | _es. TeamSnap_ | 🇺🇸 | teamsnap.com | Seats + tier | React SPA | leader nicchia amatoriale |
| 2 | _Spond_ | 🇪🇺 | spond.com | Freemium | React Native | mobile-first |
| 3 | _MySport_ | 🇮🇹 | mysport.it | Flat annuale | PHP legacy | copertura federale ITA |
| 4 | | | | | | |
| 5 | | | | | | |
| 6 | | | | | | |
| 7 | | | | | | |
| 8 | | | | | | |
| 9 | | | | | | |
| 10 | | | | | | |
| 11 | | | | | | |
| 12 | | | | | | |
| 13 | | | | | | |
| 14 | | | | | | |
| 15 | | | | | | |
| 16 | | | | | | |
| 17 | | | | | | |
| 18 | | | | | | |
| 19 | | | | | | |
| 20 | | | | | | |

---

## 3. Feature matrix

> Lista delle feature **di dominio** (non piattaforma). Compila per
> ogni competitor se la offre. Le prime 4 colonne sono conteggi:
>
> - **✅** = numero competitor che la offrono
> - **%** = percentuale su totale competitor
> - **Tier** = CORE (≥60%), DIFF (30–60%), OUT (<30%)
> - **NEOGESYS** = ✅/⚠️/⬜ se la includiamo

| Feature | ✅ | % | Tier | NEOGESYS | C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 | C9 | C10 | C11 | C12 | C13 | C14 | C15 | C16 | C17 | C18 | C19 | C20 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| _Iscrizione {{PRIMARY_ENTITY}}_ | | | | | | | | | | | | | | | | | | | | | | | | |
| _Gestione pagamenti_ | | | | | | | | | | | | | | | | | | | | | | | | |
| _Calendario/prenotazioni_ | | | | | | | | | | | | | | | | | | | | | | | | |
| _Comunicazioni_ | | | | | | | | | | | | | | | | | | | | | | | | |
| _Report/analytics_ | | | | | | | | | | | | | | | | | | | | | | | | |
| _App mobile_ | | | | | | | | | | | | | | | | | | | | | | | | |
| _Integrazione pagamenti_ | | | | | | | | | | | | | | | | | | | | | | | | |
| _Fatturazione_ | | | | | | | | | | | | | | | | | | | | | | | | |
| _Gestione documenti_ | | | | | | | | | | | | | | | | | | | | | | | | |
| _Multi-tenant_ | | | | | | | | | | | | | | | | | | | | | | | | |
| _API pubbliche_ | | | | | | | | | | | | | | | | | | | | | | | | |
| _Webhook_ | | | | | | | | | | | | | | | | | | | | | | | | |
| _SSO_ | | | | | | | | | | | | | | | | | | | | | | | | |
| _Ruoli avanzati (RBAC)_ | | | | | | | | | | | | | | | | | | | | | | | | |
| _GDPR tools_ | | | | | | | | | | | | | | | | | | | | | | | | |
| _AI assistant_ | | | | | | | | | | | | | | | | | | | | | | | | |
| _… (aggiungi 10–20 settore-specifiche)_ | | | | | | | | | | | | | | | | | | | | | | | | |

---

## 4. Feature settore-specifiche

Compila qui le feature **uniche** del settore {{SECTOR_ITA}} che
non hanno equivalente in altri verticali. Da inserire poi nella
matrix §3.

Esempi per SPORT:
- Gestione tesseramento federale (CONI, FIGC, FIDAL, …)
- Certificato medico non agonistico/agonistico + scadenze
- Convocazioni squadra
- Classifica campionato
- Videoanalisi match

Esempi per MEDICAL:
- Ricetta elettronica SSN
- Prescrizione elettronica
- DRG / codifiche ICD-10
- Integrazione FSE (Fascicolo Sanitario Elettronico)
- Teleconsulto (WebRTC)

Esempi per RETAIL:
- Integrazione POS (hardware)
- Stampa RT (Registratore Telematico) per scontrini
- Gestione peso variabile (bilancia)
- EAN-13 / QR lookup prodotto
- Saldi con promo multi-articolo

| Feature | Descrizione 1 riga | Competitor che la offrono | Priorità |
|---|---|---|---|
| | | | |
| | | | |
| | | | |

---

## 5. Gap analysis — cose che mancano a tutti

Le feature **assenti** in TUTTI i 20 competitor sono opportunità
differenziali per NEOGESYS. Da valutare se includerle come MVP
o come roadmap.

> **Attenzione**: se manca a tutti, può essere perché davvero non
> serve. Controlla con 2–3 interview a utenti reali prima di
> metterla come "must-have".

| Gap | Perché manca | Ipotesi NEOGESYS | Priorità |
|---|---|---|---|
| _Es: AI suggerimenti formazione basati su storico_ | nessuno ha integrato LLM | pilota con Claude 4.5 | 🟡 differenziante |
| | | | |
| | | | |

---

## 6. Pricing benchmark

Matrice pricing per dimensionare i tier NEOGESYS {{SECTOR}}:

| Competitor | Trial | Free | Starter | Pro | Enterprise | Model |
|---|---|---|---|---|---|---|
| | | | | | | per-seat / flat / usage |
| | | | | | | |
| | | | | | | |

Media starter: €___/mese
Media pro: €___/mese
Mediana features starter: ___
Mediana features pro: ___

→ NEOGESYS {{SECTOR}} tier proposti:
- **Trial**: 30 gg, features Pro
- **Free**: max 20 {{PRIMARY_ENTITY_PLURAL}}, 1 user
- **Base**: €___/mese — features CORE (Tier CORE da matrix)
- **Pro**: €___/mese — features CORE + DIFF selezionate
- **Enterprise**: custom — white label, API illimitate, SLA

---

## 7. Conclusioni

### 7.1 Feature CORE per NEOGESYS {{SECTOR}} (copia in `02-feature-spec.md`)

1. _compila dopo matrix §3_
2. _…_
3. _…_

### 7.2 Differenziatori proposti

1. _…_
2. _…_

### 7.3 Out-of-scope (non implementare in v1)

1. _…_
2. _…_

### 7.4 Rischi

- _Es: settore con molti leader locali → difficile penetrare_
- _Es: vincoli normativi forti (sanità, legale) → certificazioni?_

---

## 8. Firma

- Analisi compilata da: _Claude Design / Claude Code + human review_
- Human reviewer: _…_
- Data approvazione: _…_
- Prossimo step: generare feature spec (Fase 2 del master prompt)
