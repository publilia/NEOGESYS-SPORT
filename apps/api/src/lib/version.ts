/**
 * NEOGESYS Sport API · Versione.
 *
 * Mirror server-side di `apps/web/src/lib/version.ts`. La fonte di verità
 * resta il file `VERSION` al root del monorepo (CalVer `YYYY.M.PATCH`).
 *
 * Override possibile via env var `APP_VERSION` — utile per deploy di
 * staging o rilasci canary che vogliono annunciarsi con un tag diverso
 * dal sorgente.
 */

const STATIC_VERSION = "2026.4.1";
const STATIC_RELEASE_DATETIME = "2026-04-19T15:00:00Z";

export const APP_VERSION: string =
	process.env.APP_VERSION && process.env.APP_VERSION.trim().length > 0
		? process.env.APP_VERSION
		: STATIC_VERSION;

export const APP_RELEASE_DATE = "2026-04-19";

/** Data + ora di rilascio (ISO 8601, UTC). Override via BUILD_TIME env var. */
export const APP_RELEASE_DATETIME: string =
	process.env.BUILD_TIME && process.env.BUILD_TIME.trim().length > 0
		? process.env.BUILD_TIME
		: STATIC_RELEASE_DATETIME;

export const APP_NAME = "NEOGESYS Sport";

/** Protocollo di interoperabilità esposto dal manifest ecosystem. */
export const ECOSYSTEM_PROTOCOL_VERSION = "neogesys-ecosystem/1";
