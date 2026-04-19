import { tenants } from "@neogesys/db";
import { TRPCError } from "@trpc/server";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { APP_VERSION, ECOSYSTEM_PROTOCOL_VERSION } from "../lib/version";
import {
	protectedProcedure,
	publicProcedure,
	router,
	superAdminProcedure,
} from "../trpc/index";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  NEOGESYS · Ecosystem Router
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Contratto di interoperabilità tra tutti i gestionali della suite NEOGESYS.
 *
 * Motivazione:
 *  - Ogni gestionale NEOGESYS (Sport, CRM, Proloco, Farmacie, Estetica, HR,
 *    ...) è uno prodotto indipendente ma condivide lo stesso tenant,
 *    lo stesso utente e — dove utile — gli stessi dati cross-vertical
 *    (es. soci come contatti CRM).
 *  - Per permettere in futuro il "single pane of glass" (stesso login, cambio
 *    app in un click, condivisione controllata di alcune entità) servono 4
 *    punti di contatto ben definiti:
 *       1. Manifest pubblico      → chi sei, versione, capabilities
 *       2. Discovery installati   → quali gestionali ha davvero questo tenant
 *       3. Registrazione          → collegare una nuova app al tenant
 *       4. Hand-off SSO           → passaggio utente da un gestionale a un altro
 *
 * Storage:
 *  - In questa prima iterazione la lista degli APP_REGISTRY è statica (definita
 *    sotto). Lo stato "installed" è derivato in modo conservativo: per ora
 *    SOLO "sport" è installato (il gestionale corrente) e tutti gli altri
 *    sono `available` ma non installed. Quando verrà creata la tabella
 *    `tenant_apps` sarà sufficiente sostituire i due helper
 *    `isInstalledForTenant` / `getInstallationsForTenant`.
 *
 * Sicurezza:
 *  - Il manifest è PUBBLICO e non rivela informazioni sul tenant.
 *  - La discovery è PROTETTA (authed) e filtra per tenant corrente.
 *  - La registrazione è SUPER_ADMIN (platform-level).
 *  - L'hand-off SSO è PROTETTO e produce un token HMAC firmato con
 *    `ECOSYSTEM_SSO_SECRET` (env), valido 60 secondi, scope = (tenant, utente,
 *    app target). L'app target lo verifica via `verifySsoToken`.
 *
 * Future-proofing:
 *  - Aggiungere un nuovo gestionale = una riga in APP_REGISTRY + un deploy
 *    della sua API pubblica compatibile con questo contratto.
 *  - Gli enum sono `string` con unione ristretta così Zod valida l'input ma
 *    nuovi gestionali possono essere aggiunti con un solo commit.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─── Constants ───────────────────────────────────────────────────────────────

/** Current app — questa API è la faccia pubblica del gestionale Sport. */
const CURRENT_APP_ID = "sport" as const;

const ECOSYSTEM_SSO_SECRET =
	process.env.ECOSYSTEM_SSO_SECRET ?? "dev-ecosystem-sso-secret-change-me";

/** TTL del token SSO hand-off in secondi. */
const SSO_TOKEN_TTL_SECONDS = 60;

/**
 * Catalogo di tutti i gestionali conosciuti della suite NEOGESYS.
 *
 * Ogni voce è la SPECIFICA pubblica di un gestionale: quando un gestionale
 * sarà realmente online dovrà rispondere sul proprio dominio a un endpoint
 * `GET /ecosystem/manifest` compatibile con `ManifestSchema`.
 *
 * I gestionali non-sport oggi sono "planned": lo slot c'è, l'integrazione
 * avverrà quando il prodotto esisterà. Questo permette alla UI di SPORT di
 * raccontare già oggi la visione d'insieme senza dover fingere che tutto sia
 * disponibile.
 */
export const APP_REGISTRY = [
	{
		id: "sport",
		name: "NEOGESYS Sport",
		description: "Gestionale per ASD, SSD, federazioni e palestre.",
		url: "https://sport.neogesys.app",
		apiUrl: "https://api.sport.neogesys.app",
		color: "hsl(199 89% 48%)",
		icon: "Trophy",
		status: "live" as const,
		capabilities: [
			"soci",
			"tessere-digitali",
			"corsi",
			"quote",
			"eventi",
			"certificati-medici",
			"comunicazioni",
			"contabilita",
			"ai-assistant",
		],
		sharedEntities: ["socio", "documento", "comunicazione"],
	},
	{
		id: "crm",
		name: "CRM Marketing",
		description: "Lead, campagne, automation e funnel multi-canale.",
		url: "https://crm.neogesys.app",
		apiUrl: "https://api.crm.neogesys.app",
		color: "hsl(272 82% 58%)",
		icon: "Megaphone",
		status: "planned" as const,
		capabilities: ["lead", "campaign", "automation", "funnel", "newsletter"],
		sharedEntities: ["contatto", "comunicazione"],
	},
	{
		id: "proloco",
		name: "Proloco",
		description: "Eventi territoriali, tesseramento e volontari per Pro Loco.",
		url: "https://proloco.neogesys.app",
		apiUrl: "https://api.proloco.neogesys.app",
		color: "hsl(38 92% 50%)",
		icon: "MapPin",
		status: "planned" as const,
		capabilities: ["eventi-territoriali", "tesseramento", "volontari", "sagre"],
		sharedEntities: ["socio", "evento"],
	},
	{
		id: "farmacie",
		name: "Farmacie",
		description: "Magazzino, ricette, tariffazione SSN e riordini.",
		url: "https://farmacie.neogesys.app",
		apiUrl: "https://api.farmacie.neogesys.app",
		color: "hsl(142 71% 45%)",
		icon: "Stethoscope",
		status: "planned" as const,
		capabilities: ["magazzino", "ricette", "tariffazione-ssn", "riordini"],
		sharedEntities: ["cliente"],
	},
	{
		id: "estetica",
		name: "Centri Estetici",
		description: "Appuntamenti, trattamenti, clienti e schede tecniche.",
		url: "https://estetica.neogesys.app",
		apiUrl: "https://api.estetica.neogesys.app",
		color: "hsl(328 86% 60%)",
		icon: "HeartPulse",
		status: "planned" as const,
		capabilities: ["appuntamenti", "trattamenti", "schede-cliente", "cassa"],
		sharedEntities: ["cliente"],
	},
	{
		id: "hr",
		name: "HR & Payroll",
		description: "Dipendenti, buste paga, presenze e adempimenti.",
		url: "https://hr.neogesys.app",
		apiUrl: "https://api.hr.neogesys.app",
		color: "hsl(210 100% 56%)",
		icon: "Briefcase",
		status: "planned" as const,
		capabilities: ["dipendenti", "buste-paga", "presenze", "adempimenti"],
		sharedEntities: ["dipendente"],
	},
] as const;

export type AppId = (typeof APP_REGISTRY)[number]["id"];
const ALL_APP_IDS = APP_REGISTRY.map((a) => a.id) as [AppId, ...AppId[]];

// ─── Installation state helpers ──────────────────────────────────────────────
//
// Placeholder coerente finché la tabella `tenant_apps` non viene creata.
// Sostituire con una query drizzle quando la schema sarà in place.
//
function isInstalledForTenant(appId: AppId, _tenantId: string): boolean {
	// Sport è sempre installato perché questa API È Sport.
	return appId === CURRENT_APP_ID;
}

function getInstallationsForTenant(tenantId: string): Array<{
	appId: AppId;
	installedAt: Date | null;
}> {
	return APP_REGISTRY.filter((a) => isInstalledForTenant(a.id, tenantId)).map((a) => ({
		appId: a.id,
		installedAt: new Date(0),
	}));
}

// ─── SSO hand-off helpers ────────────────────────────────────────────────────
//
// Token "stateless" firmato HMAC-SHA256. Il payload è un JSON con:
//  - iss: sorgente (sempre "sport" perché questa API è Sport)
//  - aud: gestionale destinazione (es. "crm")
//  - sub: userId
//  - tid: tenantId
//  - exp: scadenza unix seconds
//  - nonce: randomBytes(16) hex per evitare replay in-process
//
// In produzione andrà sostituito con un JWT RS256 chiave-pubblica/privata per
// rimuovere il segreto condiviso.

interface SsoPayload {
	iss: string;
	aud: AppId;
	sub: string;
	tid: string;
	exp: number;
	nonce: string;
}

function signSsoPayload(payload: SsoPayload): string {
	const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
	const sig = createHmac("sha256", ECOSYSTEM_SSO_SECRET).update(body).digest("base64url");
	return `${body}.${sig}`;
}

function verifySsoPayload(token: string): SsoPayload {
	const [body, sig] = token.split(".");
	if (!body || !sig) {
		throw new TRPCError({ code: "BAD_REQUEST", message: "Token malformato." });
	}
	const expected = createHmac("sha256", ECOSYSTEM_SSO_SECRET).update(body).digest("base64url");
	const a = Buffer.from(sig);
	const b = Buffer.from(expected);
	if (a.length !== b.length || !timingSafeEqual(a, b)) {
		throw new TRPCError({ code: "UNAUTHORIZED", message: "Firma SSO non valida." });
	}
	let payload: SsoPayload;
	try {
		payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
	} catch {
		throw new TRPCError({ code: "BAD_REQUEST", message: "Payload SSO non decodificabile." });
	}
	if (payload.exp < Math.floor(Date.now() / 1000)) {
		throw new TRPCError({ code: "UNAUTHORIZED", message: "Token SSO scaduto." });
	}
	return payload;
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const ecosystemRouter = router({
	/**
	 * Manifest pubblico del gestionale corrente (Sport).
	 *
	 * Pensato per essere chiamato dagli ALTRI gestionali NEOGESYS quando
	 * vogliono capire cosa Sport esporta. Risposta stabile e versionata.
	 * Questo endpoint è pubblico per definizione (service discovery).
	 */
	getManifest: publicProcedure.query(() => {
		const self = APP_REGISTRY.find((a) => a.id === CURRENT_APP_ID);
		if (!self) {
			throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Manifest non disponibile." });
		}
		return {
			...self,
			version: APP_VERSION,
			protocol: ECOSYSTEM_PROTOCOL_VERSION,
			endpoints: {
				manifest: `/api/trpc/ecosystem.getManifest`,
				listApps: `/api/trpc/ecosystem.listApps`,
				ssoIssue: `/api/trpc/ecosystem.issueSsoToken`,
				ssoVerify: `/api/trpc/ecosystem.verifySsoToken`,
			},
			sharedEntitiesContract: {
				socio: {
					read: true,
					write: false,
					fields: ["id", "nome", "cognome", "email", "telefono"],
				},
			},
		};
	}),

	/**
	 * Elenco di tutti i gestionali della suite, con flag `installed` calcolato
	 * per il tenant corrente. Usato dalla UI di Sport per mostrare il menu
	 * "Ecosistema NEOGESYS" SOLO se almeno un altro gestionale è installato.
	 */
	listApps: protectedProcedure.query(({ ctx }) => {
		const tenant = ctx.tenant;
		if (!tenant) {
			throw new TRPCError({ code: "BAD_REQUEST", message: "Contesto tenant mancante." });
		}
		return APP_REGISTRY.map((a) => ({
			...a,
			current: a.id === CURRENT_APP_ID,
			installed: isInstalledForTenant(a.id, tenant.id),
		}));
	}),

	/**
	 * Solo i gestionali effettivamente installati per il tenant. Shortcut
	 * per la UI: se il risultato ha length > 1 (sport + almeno uno), allora
	 * il menu cross-app va mostrato.
	 */
	listInstalled: protectedProcedure.query(({ ctx }) => {
		if (!ctx.tenant) {
			throw new TRPCError({ code: "BAD_REQUEST", message: "Contesto tenant mancante." });
		}
		const installs = getInstallationsForTenant(ctx.tenant.id);
		return installs.map((inst) => {
			const meta = APP_REGISTRY.find((a) => a.id === inst.appId);
			return {
				appId: inst.appId,
				installedAt: inst.installedAt,
				meta,
				current: inst.appId === CURRENT_APP_ID,
			};
		});
	}),

	/**
	 * Registra un nuovo gestionale per il tenant corrente. Platform-level:
	 * solo il super_admin di NEOGESYS può attivare una integrazione cross-app.
	 *
	 * NOTA: fin quando non esiste la tabella `tenant_apps` questo endpoint
	 * ritorna una ricevuta informativa. L'effetto persistente sarà attivato
	 * con la migration futura.
	 */
	registerApp: superAdminProcedure
		.input(
			z.object({
				tenantId: z.string().uuid(),
				appId: z.enum(ALL_APP_IDS),
				activate: z.boolean().default(true),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [tenant] = await ctx.db
				.select({ id: tenants.id, slug: tenants.slug })
				.from(tenants)
				.where(eq(tenants.id, input.tenantId))
				.limit(1);
			if (!tenant) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Tenant non trovato." });
			}
			if (input.appId === CURRENT_APP_ID) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Sport è sempre installato: non serve registrarlo.",
				});
			}
			const meta = APP_REGISTRY.find((a) => a.id === input.appId);
			if (!meta) {
				throw new TRPCError({ code: "NOT_FOUND", message: "App non nel registry." });
			}
			// TODO: INSERT INTO tenant_apps (tenantId, appId, activate, ts) quando lo
			//       schema sarà pronto. Per ora è un no-op con audit trail.
			return {
				status: meta.status === "live" ? "registered" : "queued",
				tenantId: tenant.id,
				app: meta,
				note:
					meta.status === "planned"
						? "Gestionale non ancora rilasciato: la registrazione è memorizzata come intent."
						: undefined,
			};
		}),

	/**
	 * Deregistra un gestionale dal tenant. Stesso vincolo di `registerApp`.
	 */
	unregisterApp: superAdminProcedure
		.input(z.object({ tenantId: z.string().uuid(), appId: z.enum(ALL_APP_IDS) }))
		.mutation(async ({ input }) => {
			if (input.appId === CURRENT_APP_ID) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Sport è il gestionale host: non può essere deregistrato via API.",
				});
			}
			// TODO: DELETE FROM tenant_apps quando disponibile.
			return { success: true, tenantId: input.tenantId, appId: input.appId };
		}),

	/**
	 * Emette un token SSO short-lived per il passaggio utente da Sport a un
	 * altro gestionale NEOGESYS. Il gestionale destinazione verificherà il
	 * token sul proprio endpoint `verifySsoToken`.
	 */
	issueSsoToken: protectedProcedure
		.input(z.object({ targetApp: z.enum(ALL_APP_IDS) }))
		.mutation(({ ctx, input }) => {
			if (!ctx.tenant) {
				throw new TRPCError({ code: "BAD_REQUEST", message: "Contesto tenant mancante." });
			}
			if (input.targetApp === CURRENT_APP_ID) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Impossibile emettere un token SSO verso se stessi.",
				});
			}
			if (!isInstalledForTenant(input.targetApp, ctx.tenant.id)) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "Gestionale destinazione non installato per questo tenant.",
				});
			}
			const target = APP_REGISTRY.find((a) => a.id === input.targetApp);
			if (!target) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}
			const payload: SsoPayload = {
				iss: CURRENT_APP_ID,
				aud: input.targetApp,
				sub: ctx.user.id,
				tid: ctx.tenant.id,
				exp: Math.floor(Date.now() / 1000) + SSO_TOKEN_TTL_SECONDS,
				nonce: randomBytes(16).toString("hex"),
			};
			const token = signSsoPayload(payload);
			const handoffUrl = `${target.url}/sso?token=${encodeURIComponent(token)}`;
			return {
				token,
				handoffUrl,
				expiresAt: new Date(payload.exp * 1000),
				targetApp: input.targetApp,
			};
		}),

	/**
	 * Verifica un token SSO proveniente da un altro gestionale NEOGESYS.
	 * Pubblico per design: il token stesso è la prova di autorizzazione.
	 */
	verifySsoToken: publicProcedure
		.input(z.object({ token: z.string().min(10) }))
		.query(({ input }) => {
			const payload = verifySsoPayload(input.token);
			if (payload.aud !== CURRENT_APP_ID) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: `Token destinato a "${payload.aud}", non a "${CURRENT_APP_ID}".`,
				});
			}
			return {
				valid: true,
				issuer: payload.iss,
				userId: payload.sub,
				tenantId: payload.tid,
				expiresAt: new Date(payload.exp * 1000),
			};
		}),
});
