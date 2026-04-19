# NEOGESYS · Design System

> **Il brand NEOGESYS è il punto di unicità della suite** — la
> cosa che lo distingue da qualsiasi altro gestionale generico.
> La quasar (stella + disco di accrescimento + getti polari) non
> è decorativa: è il visual metaphor della suite — "un sistema
> gestionale che pulsa come una quasar: sempre attivo, sempre
> luminoso". NON SI TOCCA quando si clona su un nuovo verticale.
>
> Copia-incolla i blocchi in questo file letteralmente. Se devi
> adattare, chiedi prima.

---

## 1. Palette cosmica

| Token | Hex | HSL | Ruolo |
|---|---|---|---|
| **Starlight** | `#FFF6D9` | `48 89% 93%` | Testo su sfondi scuri, highlights, stelle |
| **Pulsar Violet** | `#8B3FE5` | `272 82% 58%` | Primary, azioni, link |
| **Pulsar Magenta** | `#ED3F9E` | `328 86% 60%` | Accent, gradient pair con violet |
| **Cosmic Cyan** | `#3BD0F2` | `192 87% 59%` | Success neutro, quark, tag info |
| **Cosmic Night** | `#13102A` | `248 46% 12%` | Sfondi scuri, wrapper logo, dark mode |

Gradient canonico (gli aloni, i CTA cosmici, le pill settore):
```css
linear-gradient(135deg, #8B3FE5 0%, #ED3F9E 100%)
```

Gradient disco di accrescimento (quasar):
```css
linear-gradient(90deg, #8B3FE5 0%, #ED3F9E 50%, #8B3FE5 100%)
```

Radial glow (aloni, button shadow):
```css
0 0 32px 4px rgba(237, 63, 158, 0.35)
```

### CSS variables (Tailwind 4)

File `apps/web/src/styles/globals.css`:
```css
:root {
  --background: 0 0% 100%;
  --foreground: 248 46% 12%;
  --primary: 272 82% 58%;      /* Pulsar Violet */
  --primary-foreground: 48 89% 93%;  /* Starlight */
  --accent: 328 86% 60%;       /* Pulsar Magenta */
  --cyan: 192 87% 59%;         /* Cosmic Cyan */
  --muted: 220 14% 96%;
  --border: 220 13% 91%;
  --success: 142 71% 40%;
  --warning: 38 92% 50%;
  --destructive: 0 70% 50%;
  --radius: 0.5rem;
}

.dark {
  --background: 248 46% 8%;    /* Cosmic Night scuro */
  --foreground: 48 89% 93%;
  --muted: 248 20% 18%;
  --border: 248 20% 22%;
  /* primary/accent/cyan invariati */
}
```

---

## 2. Logo system

Set logo ufficiale consegnato da Claude Design il **2026-04-19**, incluso
nella release `2026.4.1`. Sostituisce in modo permanente il monogramma "N"
(pre 2026.4.0) e il wordmark disegnato a mano (2026.4.0).

### 2.1 Asset files

Gli SVG canonici vivono in `apps/web/public/brand/` e
`apps/admin/public/brand/` (mirror identico). `apps/portale-socio/public/brand/`
replica gli stessi file per il portale soci.

| File | ViewBox | Colore | Uso |
|---|---|---|---|
| `neogesys-mark.svg` | 32×32 | Full color (hard-coded) | Favicon (32px+), card, splash |
| `neogesys-mark-minimal.svg` | 32×32 | `currentColor` | QuasarMenu pulsante, bottoni mono |
| `neogesys-logo-horizontal.svg` | 260×48 | Mark full + wordmark + tagline | Full canonico (con "Universal Suite") |
| `neogesys-logo-horizontal-negative.svg` | 260×48 | Mark full + wordmark #FFF6D9 | Variante su fondo scuro |
| `neogesys-logo-vertical.svg` | 240×128 | Mark + wordmark centrati | Splash, print, square cards |
| `neogesys-logo-vertical-negative.svg` | 240×128 | Versione negativa | Splash su fondo scuro |
| `neogesys-wordmark.svg` | 260×54 | Solo testo "NEOGESYS" + tagline | Riga wordmark pura, email |
| `neogesys-wordmark-negative.svg` | 260×54 | Solo testo negativo | Wordmark su fondo scuro |

Il favicon è in `apps/web/src/app/icon.svg` e `apps/admin/src/app/icon.svg`
(Next 15 App Router convention → auto-injected `<link>`).

### 2.2 React components

`apps/web/src/components/brand/neogesys-mark.tsx` (e il twin identico
`apps/admin/src/components/brand/neogesys-mark.tsx`) esporta:

- **`NeogesysMark`** — quasar full color con quark cyan, id-suffix `-nm`
  (admin: `-nm-adm`). Da usare quando serve la mark sola con colori brand
  fissi: favicon, splash screen square, og-image, social avatar.
- **`NeogesysMarkMinimal`** — quasar in `currentColor`, senza quark cyan,
  id-suffix `-nmm` (admin: `-nmm-adm`). Da usare dentro bottoni e icone
  dove la tinta deve adattarsi al parent (QuasarMenu, AI drawer trigger).
- **`NeogesysLogoHorizontal`** — mark + wordmark "NEOGESYS" compact, senza
  tagline. ViewBox 260×40. Da usare nell'AppHeader a sinistra (il sector
  viene poi reso come pill separata). Id-suffix `-nlh` (admin: `-nlh-adm`).
- **`NeogesysLogoFull`** — mark + wordmark + tagline "Universal Suite".
  ViewBox 260×48. Da usare nella splash, login, marketing, email header a
  dimensioni ≥ 32px di altezza dove la tagline diventa leggibile (a 48px
  di altezza il tagline ≈ 10px, leggibile; sotto i 32px la tagline è
  illeggibile e vanno usate altre varianti). Id-suffix `-nlf`.
- **`NeogesysWordmark`** — solo le lettere "NEOGESYS" (senza mark e senza
  tagline). ViewBox 212×30. Da usare quando la mark è già presente altrove
  (es. email con favicon già visibile in alto, PDF con logo box a parte).

Tutti condividono l'interfaccia `MarkProps`:
```ts
interface MarkProps {
  className?: string;
  size?: number | string;  // eredita 100% dal container se omesso
  title?: string;           // default "NEOGESYS" (o "NEOGESYS — Universal Suite" per Full)
  ariaHidden?: boolean;     // true → svg decorativo, niente title
}
```

Wordmark e tagline sono definiti in costanti `WORDMARK_PATHS` e
`TAGLINE_PATHS` dentro il file — singola fonte di verità riusata da
Horizontal, Full e Wordmark per evitare drift tra varianti.

### 2.3 Header layout

Il logo è sempre nell'angolo in alto a sinistra:
```tsx
<a href="/" className="logo logo-horizontal">
  <span className="logo-horizontal-wrap" aria-hidden="true">
    <NeogesysLogoHorizontal size="100%" ariaHidden />
  </span>
  <span className="logo-sector">{NEOGESYS_SECTOR}</span>
</a>
```

CSS obbligatorio (`globals.css`):
```css
.logo-horizontal-wrap {
  display: inline-flex; align-items: center; justify-content: center;
  height: 2rem; padding: 0 0.625rem;
  border-radius: 0.5rem;
  background: #13102A;               /* Cosmic Night */
  color: #FFF6D9;                    /* Starlight → wordmark */
  box-shadow: 0 0 0 1px rgba(139, 63, 229, 0.25),
              0 0 18px rgba(237, 63, 158, 0.12);
  overflow: hidden;
}
.logo-horizontal-wrap > svg { height: 1.25rem; width: auto; display: block; }

.logo-sector {
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.6875rem; font-weight: 800;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: #FFF6D9;
  background: linear-gradient(135deg, #8B3FE5 0%, #ED3F9E 100%);
  box-shadow: 0 0 12px rgba(237, 63, 158, 0.35);
}
```

### 2.4 Sector variable

`apps/web/src/lib/brand.ts` espone la variabile settore:
```ts
export const NEOGESYS_BRAND = {
  name: "NEOGESYS",
  sector: "SPORT",        // ← cambia questo
  sectorLabel: "Sport",
  tagline: "La suite gestionale che pulsa come una quasar",
} as const;
```

Questa è l'UNICA riga da cambiare per rebrandare il verticale.
Tutti i componenti leggono `NEOGESYS_SECTOR` da qui.

---

## 3. QuasarMenu — l'icona pulsante

In alto a destra (ultimo elemento della header-right) c'è il
**QuasarMenu**: bottone circolare con alone che pulsa, e la mark
quasar minimal dentro che pulsa indipendentemente.

### Regole

- Posizione: `apps/web/src/components/quasar-menu.tsx`
- Icona interna: **SEMPRE** `<NeogesysMarkMinimal>` — mai lucide-icons
- Animazione alone esterna: `quasar-pulse` 2.4s
- Animazione mark interna: `quasar-pulse-inner` 2.4s (in fase)
- `prefers-reduced-motion` → entrambe disabilitate

CSS (`globals.css`):
```css
@keyframes quasar-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(237, 63, 158, 0.45),
                0 0 8px 2px rgba(139, 63, 229, 0.3);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(237, 63, 158, 0),
                0 0 20px 4px rgba(139, 63, 229, 0.5);
  }
}
@keyframes quasar-pulse-inner {
  0%, 100% { transform: scale(1); filter: brightness(1); }
  50%      { transform: scale(1.06);
             filter: brightness(1.2)
                     drop-shadow(0 0 2px rgba(255,246,217,0.6)); }
}

.quasar-btn {
  width: 2.5rem; height: 2.5rem; border-radius: 9999px;
  background: linear-gradient(135deg, #8B3FE5 0%, #ED3F9E 100%);
  color: #FFF6D9;
  display: grid; place-items: center;
  animation: quasar-pulse 2.4s ease-in-out infinite;
  border: none; cursor: pointer;
}
.quasar-btn .quasar-btn-mark {
  color: #FFF6D9;
  transform-origin: center;
  animation: quasar-pulse-inner 2.4s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .quasar-btn, .quasar-btn .quasar-btn-mark { animation: none; }
}
```

---

## 4. Componenti canonici

Questi componenti esistono già in `apps/web/src/components/`.
Nessuno va riscritto da zero — vanno **copiati 1:1** nel nuovo verticale.

| Componente | Path | Ruolo |
|---|---|---|
| `AppHeader` | `layout/app-header.tsx` | Header globale con logo+tenant+menu |
| `Sidebar` | `layout/sidebar.tsx` | Nav laterale (collapsible) |
| `TopNav` | `layout/topnav.tsx` | Nav top (alternativa a sidebar) |
| `MobileDrawer` | `layout/mobile-drawer.tsx` | Menu mobile |
| `TenantMenu` | `layout/tenant-menu.tsx` | Dropdown tenant + impersonation |
| `PlatformContextEmpty` | `layout/platform-context-empty.tsx` | Placeholder super_admin no-tenant |
| `QuasarMenu` | `quasar-menu.tsx` | Menu top-right (crediti, piano, health) |
| `CommandPalette` | `command-palette.tsx` | ⌘K search |
| `AIDrawer` | `ai-drawer.tsx` | ⌘J assistente AI |
| `PaletteSelector` | `palette-selector.tsx` | Cambio palette tenant |
| `ThemeToggle` | `theme-toggle.tsx` | Dark/light |
| `NeogesysMark` | `brand/neogesys-mark.tsx` | Vedi §2.2 |

---

## 5. Tipografia

- Font family: default system + Inter via `next/font/google`
- Scala tipografica:
  - `text-xs` → 0.75rem (badge, label)
  - `text-sm` → 0.875rem (body piccolo, nav)
  - `text-base` → 1rem (body)
  - `text-lg` → 1.125rem (intro)
  - `page-title` → 1.5rem bold (h1 pagina)
- Font mono: `ui-monospace, SFMono-Regular, Menlo, monospace`
  per path, route, ID, debug footer.
- Letter spacing: `-0.02em` su heading, `0.08em uppercase` su badge.

---

## 6. Spacing & radius

- Unità base: `0.25rem` (4px)
- Padding card: `1rem` (`p-4`)
- Gap section: `1.5rem` (`gap-6`)
- Radius default: `0.5rem`
- Radius pill: `9999px`
- Border: `1px solid hsl(var(--border))`

---

## 7. Icone

**Solo `lucide-react`.** Nessun altro set consentito.

Dimensioni canoniche:
```css
.icon-sm { width: 0.875rem; height: 0.875rem; }
.icon    { width: 1rem;     height: 1rem;     }
.icon-lg { width: 1.25rem;  height: 1.25rem;  }
```

Le icone nel logo/brand NON sono mai da lucide — usa i componenti
`<NeogesysMark*>`.

---

## 8. Animazioni globali

Oltre alla `quasar-pulse`, una manciata di animazioni standard.
**Tutte** rispettano `prefers-reduced-motion`.

```css
@keyframes fade-in  { from { opacity: 0; } to { opacity: 1; } }
@keyframes slide-up { from { opacity: 0; transform: translateY(8px); }
                      to   { opacity: 1; transform: translateY(0); } }
@keyframes shake    { 0%, 100% { transform: translateX(0); }
                      25%      { transform: translateX(-4px); }
                      75%      { transform: translateX(4px); } }

@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important; }
}
```

framer-motion usato solo per transizioni complesse (drawer, modal),
mai per hover/focus semplici (gestite da CSS transitions).

---

## 9. Palette switcher per tenant

Ogni tenant può scegliere la propria **palette** dall'elenco in
`apps/web/src/lib/palettes.ts`. La palette "Cosmic" è la default
NEOGESYS. Le altre palette (Ocean, Forest, Sunset, …) sono
alternative che **non toccano** il brand primario (logo + quasar
restano sempre cosmici).

Selector: `<PaletteSelector />` nel header, triggerabile anche da
`/impostazioni#branding`.

---

## 10. Accessibilità

- **Contrast ratio ≥ 4.5:1** per tutti i pairs di colori testo/sfondo
  (verificato: Starlight su Cosmic Night → 13.4:1 ✅)
- Tutti i componenti interattivi hanno `aria-label` o `title`
- Focus ring visibile (NON `outline: none`)
- Skip link `<a href="#main-content">` prima del header
- Tutte le animazioni → `prefers-reduced-motion` fallback

---

## 11. Checklist brand per nuovo verticale

Quando generi NEOGESYS {{SECTOR_UPPER}}, verifica:

- [ ] 4 SVG in `public/brand/` (identici al source NEOGESYS SPORT)
- [ ] `icon.svg` in `app/icon.svg` (favicon)
- [ ] `brand.ts` con `sector: "{{SECTOR_UPPER}}"`
- [ ] Header mostra logo + sector pill (cosmic gradient)
- [ ] QuasarMenu con `NeogesysMarkMinimal` pulsante
- [ ] Palette cosmica attiva in `globals.css`
- [ ] `prefers-reduced-motion` rispettato
- [ ] Componenti canonici §4 presenti e 1:1 con source
- [ ] `lucide-react` unico icon set
- [ ] Nessun Material UI / Ant Design / shadcn / heroicons
