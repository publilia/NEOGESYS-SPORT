import {
	CALENDAR_SCOPES,
	GoogleCalendarService,
	GoogleOAuthClient,
} from "@neogesys/integrations/google";
import type { GoogleAuthConfig } from "@neogesys/integrations/google";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../trpc/index";

// ─── Helpers ────────────────────────────────────────────────────────────────

function requireTenant(tenantId: string | undefined): string {
	if (!tenantId) {
		throw new TRPCError({ code: "BAD_REQUEST", message: "Contesto tenant mancante." });
	}
	return tenantId;
}

function toAuthConfig(creds: Record<string, string>): GoogleAuthConfig {
	return {
		clientId: creds.clientId ?? "",
		clientSecret: creds.clientSecret ?? "",
		redirectUri: creds.redirectUri ?? "",
		refreshToken: creds.refreshToken ?? "",
		accessToken: creds.accessToken,
	};
}

async function getCalendarService(
	tenantId: string,
	vault: { getCredentials(t: string, p: string): Promise<Record<string, string> | null> },
): Promise<GoogleCalendarService> {
	const credentials = await vault.getCredentials(tenantId, "google_calendar");
	if (!credentials) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "Google Calendar non configurato. Completare prima il flusso OAuth.",
		});
	}
	return new GoogleCalendarService(toAuthConfig(credentials));
}

// ─── Router ─────────────────────────────────────────────────────────────────

export const googleCalendarRouter = router({
	/**
	 * Start the OAuth flow for Google Calendar.
	 * Returns the URL the admin should open in their browser.
	 */
	startOAuth: adminProcedure
		.input(
			z.object({
				clientId: z.string().min(1),
				clientSecret: z.string().min(1),
				redirectUri: z.string().url(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			requireTenant(ctx.tenant?.id);

			const client = new GoogleOAuthClient({
				clientId: input.clientId,
				clientSecret: input.clientSecret,
				redirectUri: input.redirectUri,
				refreshToken: "",
			});

			const authUrl = client.getAuthUrl(CALENDAR_SCOPES);
			return { authUrl };
		}),

	/**
	 * Handle the OAuth callback: exchange the code for tokens and persist.
	 */
	handleCallback: adminProcedure
		.input(
			z.object({
				code: z.string().min(1),
				clientId: z.string().min(1),
				clientSecret: z.string().min(1),
				redirectUri: z.string().url(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);

			const client = new GoogleOAuthClient({
				clientId: input.clientId,
				clientSecret: input.clientSecret,
				redirectUri: input.redirectUri,
				refreshToken: "",
			});

			const tokens = await client.exchangeCode(input.code);

			await ctx.vault.setCredentials(tenantId, "google_calendar", "calendar", {
				clientId: input.clientId,
				clientSecret: input.clientSecret,
				redirectUri: input.redirectUri,
				refreshToken: tokens.refreshToken,
				accessToken: tokens.accessToken,
			});

			return { success: true };
		}),

	/**
	 * List all calendars visible to the authenticated Google account.
	 */
	listCalendars: protectedProcedure.query(async ({ ctx }) => {
		const tenantId = requireTenant(ctx.tenant?.id);
		const calendar = await getCalendarService(tenantId, ctx.vault);
		return calendar.listCalendars();
	}),

	/**
	 * List events from a calendar with optional time range and search query.
	 */
	listEvents: protectedProcedure
		.input(
			z.object({
				calendarId: z.string().min(1),
				timeMin: z.string().datetime().optional(),
				timeMax: z.string().datetime().optional(),
				query: z.string().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			const calendar = await getCalendarService(tenantId, ctx.vault);

			return calendar.listEvents(
				input.calendarId,
				input.timeMin ? new Date(input.timeMin) : undefined,
				input.timeMax ? new Date(input.timeMax) : undefined,
				input.query,
			);
		}),

	/**
	 * Create a new calendar event.
	 */
	createEvent: adminProcedure
		.input(
			z.object({
				calendarId: z.string().min(1),
				event: z.object({
					summary: z.string().min(1),
					description: z.string().optional(),
					location: z.string().optional(),
					start: z.object({
						dateTime: z.string(),
						timeZone: z.string().default("Europe/Rome"),
					}),
					end: z.object({
						dateTime: z.string(),
						timeZone: z.string().default("Europe/Rome"),
					}),
					attendees: z
						.array(
							z.object({
								email: z.string().email(),
								displayName: z.string().optional(),
							}),
						)
						.optional(),
					recurrence: z.array(z.string()).optional(),
					colorId: z.string().optional(),
				}),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			const calendar = await getCalendarService(tenantId, ctx.vault);
			return calendar.createEvent(input.calendarId, input.event);
		}),

	/**
	 * Update an existing calendar event.
	 */
	updateEvent: adminProcedure
		.input(
			z.object({
				calendarId: z.string().min(1),
				eventId: z.string().min(1),
				event: z.object({
					summary: z.string().optional(),
					description: z.string().optional(),
					location: z.string().optional(),
					start: z
						.object({
							dateTime: z.string(),
							timeZone: z.string().default("Europe/Rome"),
						})
						.optional(),
					end: z
						.object({
							dateTime: z.string(),
							timeZone: z.string().default("Europe/Rome"),
						})
						.optional(),
					attendees: z
						.array(
							z.object({
								email: z.string().email(),
								displayName: z.string().optional(),
							}),
						)
						.optional(),
					colorId: z.string().optional(),
				}),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			const calendar = await getCalendarService(tenantId, ctx.vault);
			return calendar.updateEvent(input.calendarId, input.eventId, input.event);
		}),

	/**
	 * Delete a calendar event.
	 */
	deleteEvent: adminProcedure
		.input(
			z.object({
				calendarId: z.string().min(1),
				eventId: z.string().min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			const calendar = await getCalendarService(tenantId, ctx.vault);
			await calendar.deleteEvent(input.calendarId, input.eventId);
			return { success: true };
		}),

	/**
	 * Sync corsi (courses) to Google Calendar.
	 * Creates or updates events for each corso lezione in the calendar.
	 */
	syncCorsi: adminProcedure
		.input(
			z.object({
				calendarId: z.string().min(1),
				corsi: z.array(
					z.object({
						id: z.string(),
						nome: z.string(),
						descrizione: z.string().optional(),
						luogo: z.string().optional(),
						disciplina: z.string().optional(),
						lezioni: z.array(
							z.object({
								giorno: z.number().int().min(0).max(6),
								oraInizio: z.string(),
								oraFine: z.string(),
							}),
						),
						dataInizio: z.string(),
						dataFine: z.string(),
					}),
				),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			const calendar = await getCalendarService(tenantId, ctx.vault);

			const results: Array<{ corsoId: string; eventIds: string[] }> = [];

			for (const corso of input.corsi) {
				const eventIds: string[] = [];

				for (const lezione of corso.lezioni) {
					const daysMap = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
					const rruleDay = daysMap[lezione.giorno];

					const event = await calendar.createEvent(input.calendarId, {
						summary: corso.nome,
						description: corso.descrizione ?? `Corso: ${corso.nome}`,
						location: corso.luogo,
						start: {
							dateTime: `${corso.dataInizio}T${lezione.oraInizio}:00`,
							timeZone: "Europe/Rome",
						},
						end: {
							dateTime: `${corso.dataInizio}T${lezione.oraFine}:00`,
							timeZone: "Europe/Rome",
						},
						recurrence: [
							`RRULE:FREQ=WEEKLY;BYDAY=${rruleDay};UNTIL=${corso.dataFine.replace(/-/g, "")}T235959Z`,
						],
					});

					eventIds.push(event.id);
				}

				results.push({ corsoId: corso.id, eventIds });
			}

			return { synced: results, count: results.length };
		}),

	/**
	 * Sync eventi (one-off events) to Google Calendar.
	 */
	syncEventi: adminProcedure
		.input(
			z.object({
				calendarId: z.string().min(1),
				eventi: z.array(
					z.object({
						id: z.string(),
						titolo: z.string(),
						descrizione: z.string().optional(),
						luogo: z.string().optional(),
						dataInizio: z.string(),
						dataFine: z.string(),
						partecipanti: z
							.array(z.object({ email: z.string().email(), nome: z.string().optional() }))
							.optional(),
					}),
				),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			const calendar = await getCalendarService(tenantId, ctx.vault);

			const results: Array<{ eventoId: string; googleEventId: string }> = [];

			for (const evento of input.eventi) {
				const created = await calendar.createEvent(input.calendarId, {
					summary: evento.titolo,
					description: evento.descrizione,
					location: evento.luogo,
					start: { dateTime: evento.dataInizio, timeZone: "Europe/Rome" },
					end: { dateTime: evento.dataFine, timeZone: "Europe/Rome" },
					attendees: evento.partecipanti?.map((p) => ({
						email: p.email,
						displayName: p.nome,
					})),
				});

				results.push({ eventoId: evento.id, googleEventId: created.id });
			}

			return { synced: results, count: results.length };
		}),

	/**
	 * Setup a webhook to receive push notifications for calendar changes.
	 */
	setupWebhook: adminProcedure
		.input(
			z.object({
				calendarId: z.string().min(1),
				webhookUrl: z.string().url(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			const calendar = await getCalendarService(tenantId, ctx.vault);
			return calendar.watchEvents(input.calendarId, input.webhookUrl);
		}),
});
