/**
 * NEOGESYS Sport · Versione client (web).
 *
 * La fonte di verità è il file `VERSION` al root del monorepo (CalVer
 * `YYYY.M.PATCH`). Questo modulo è volutamente minimalista: una costante
 * aggiornata dal release script (`scripts/release.mjs`) insieme al VERSION
 * file e al CHANGELOG.
 *
 * In produzione il server può override-are via `NEXT_PUBLIC_APP_VERSION`,
 * utile per marcare build di staging / preview deploy senza toccare il
 * sorgente. Idem per `NEXT_PUBLIC_BUILD_TIME` (ISO 8601 string) che marca
 * l'ora esatta del build per CI/CD.
 *
 * Nota: il formato `YYYY.M.PATCH` non usa zero-padding sul mese
 * (es. `2026.4.1`, non `2026.04.01`) per allinearsi a SemVer-like e
 * rimanere parsabile da `npm` come range.
 */

const STATIC_VERSION = "2026.4.1";

/**
 * Data + ora di rilascio della build dev (ISO 8601, UTC).
 * Allineata con l'entry del CHANGELOG e bumpata dal release script.
 * In dev mode questo è il timestamp del taglio del release; in
 * produzione viene sovrascritto da NEXT_PUBLIC_BUILD_TIME (iniettato
 * da Docker / CI al build-time).
 */
const STATIC_RELEASE_DATETIME = "2026-04-19T15:00:00Z";

export const APP_VERSION: string =
	typeof process !== "undefined" && process.env?.NEXT_PUBLIC_APP_VERSION
		? process.env.NEXT_PUBLIC_APP_VERSION
		: STATIC_VERSION;

/** Data di rilascio (YYYY-MM-DD). Allineata con l'entry del CHANGELOG. */
export const APP_RELEASE_DATE = "2026-04-19";

/** Data + ora di rilascio (ISO 8601, UTC). */
export const APP_RELEASE_DATETIME: string =
	typeof process !== "undefined" && process.env?.NEXT_PUBLIC_BUILD_TIME
		? process.env.NEXT_PUBLIC_BUILD_TIME
		: STATIC_RELEASE_DATETIME;

/** Ora di rilascio in formato leggibile (es. "15:00 UTC"). */
export const APP_RELEASE_TIME: string = (() => {
	try {
		const d = new Date(APP_RELEASE_DATETIME);
		const hh = String(d.getUTCHours()).padStart(2, "0");
		const mm = String(d.getUTCMinutes()).padStart(2, "0");
		return `${hh}:${mm} UTC`;
	} catch {
		return "—";
	}
})();

/**
 * Formato umano completo italiano: "19 aprile 2026, 15:00 UTC".
 * Utile per tooltip e footer di riepilogo in UI.
 */
export function formatReleaseDateTime(): string {
	try {
		const d = new Date(APP_RELEASE_DATETIME);
		const formatted = d.toLocaleDateString("it-IT", {
			day: "numeric",
			month: "long",
			year: "numeric",
			timeZone: "UTC",
		});
		return `${formatted}, ${APP_RELEASE_TIME}`;
	} catch {
		return APP_RELEASE_DATE;
	}
}

/** Nome umano del gestionale, comodo per label header / metadata. */
export const APP_NAME = "NEOGESYS Sport";

/** Numero maggiore per confronti rapidi (anno del rilascio). */
export function getMajor(): number {
	return Number.parseInt(APP_VERSION.split(".")[0] ?? "2026", 10);
}
