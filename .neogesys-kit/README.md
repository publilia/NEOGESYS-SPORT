# NEOGESYS Kit — bootstrap multi-sector

Questo kit serve a **clonare NEOGESYS su un nuovo verticale**
(Sport → Medical → Education → Retail → Pharma → Legal → Hospitality)
mantenendo identico lo stack tecnico e il brand/UX, e parametrizzando
solo il dominio business.

## File

| File | Contenuto |
|---|---|
| [`00-master-prompt.md`](./00-master-prompt.md) | Il prompt "chiavi in mano" da incollare a Claude Design/Code, con variabili `{{…}}` e il flusso in 7 fasi. |
| [`01-tech-stack-lock.md`](./01-tech-stack-lock.md) | Versioni librerie lockate. Vietato sostituire senza permesso. |
| [`02-design-system.md`](./02-design-system.md) | Palette cosmica, componenti canonici, logo, animazioni. Il brand NEOGESYS non si tocca. |
| [`03-architecture-patterns.md`](./03-architecture-patterns.md) | Multi-tenancy, RBAC, tRPC, impersonation, layout guard. |
| [`04-domain-mapping.md`](./04-domain-mapping.md) | Traduzione entità/ruoli/flussi da Sport ai verticali target. |
| [`05-competitive-analysis-template.md`](./05-competitive-analysis-template.md) | Template vuoto per analisi 20+ competitor del settore target. |

## Workflow (dal business al codice)

```
   Human definisce settore target (es. Medical)
             │
             ▼
   Copia 00-master-prompt.md, compila {{VARIABILI}}
             │
             ▼
   Apri chat con Claude Design o Claude Code
             │
             ▼
   Incolla master prompt + allega 01, 02, 03, 04, 05
             │
             ▼
   ┌────────────────────────────────┐
   │ Fase 1: Competitive analysis   │ ← Claude compila `05-*.md`
   └────────────────────────────────┘
             │
             ▼
   ┌────────────────────────────────┐
   │ Fase 2: Feature spec           │ ← Human approva
   └────────────────────────────────┘
             │
             ▼
   ┌────────────────────────────────┐
   │ Fase 3–7: scaffolding repo     │ ← Output: repo NEOGESYS-MEDICAL
   └────────────────────────────────┘
```

## Convenzioni

- Il kit vive dentro `neogesys-sport` come **source of truth**
- Ogni nuovo verticale copia questi 6 file nella propria root `.neogesys-kit/`
- Se il kit viene modificato in un verticale, la modifica va **portata
  indietro** nel source (cross-pollination)
- Version il kit come parte del repo (CalVer come il resto)

## Policy di aggiornamento

- Modifiche al brand (§ 02) → approvazione human + notifica a tutti
  i verticali esistenti
- Modifiche allo stack (§ 01) → PR obbligatoria, test cross-vertical
- Modifiche al dominio (§ 04) → solo additive, mai rename retroattivi
- Aggiunta di un nuovo settore → compilazione prima di `05-*.md` con
  20+ competitor, poi merge del nuovo mapping in §2 + §3 del file 04

## Roadmap

- [ ] Medical — competitive analysis in corso
- [ ] Education — backlog
- [ ] Retail — backlog (difficoltà: integrazione POS hardware)
- [ ] Pharma — richiede certificazioni normative ITA (valutare)
- [ ] Legal — ipotesi
- [ ] Hospitality — ipotesi

Vedi `04-domain-mapping.md §7` per lo stato dettagliato.
