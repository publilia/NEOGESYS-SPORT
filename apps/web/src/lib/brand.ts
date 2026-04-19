/**
 * NEOGESYS · Brand config
 * ─────────────────────────────────────────────────────────────────
 * Single source of truth per le parti "variabili" del brand NEOGESYS.
 *
 * NEOGESYS è il nome della suite (fisso, mai cambia). Il secondo
 * token è il settore verticale: Sport, Pharma, Retail, Medical,
 * Education, Real Estate, Hospitality, Legal, … Questo file è
 * l'unico punto in cui va cambiata la stringa quando si clona la
 * suite per un nuovo verticale (vedi `.neogesys-kit/04-domain-mapping.md`
 * — quando verrà creato — per la lista sector canonici).
 *
 * `NEOGESYS_SECTOR` è la label maiuscola usata nell'header (accanto al
 * wordmark orizzontale) e ovunque serva distinguere l'istanza corrente.
 *
 * `NEOGESYS_SECTOR_LABEL` è la forma user-friendly (title case) per
 * titoli, emails, pagine marketing.
 */

export const NEOGESYS_BRAND = {
	name: "NEOGESYS",
	sector: "SPORT",
	sectorLabel: "Sport",
	tagline: "La suite gestionale che pulsa come una quasar",
} as const;

export const NEOGESYS_SECTOR = NEOGESYS_BRAND.sector;
export const NEOGESYS_SECTOR_LABEL = NEOGESYS_BRAND.sectorLabel;
