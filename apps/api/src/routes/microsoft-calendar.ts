import { CALENDAR_SCOPES, MicrosoftOAuthClient } from "@neogesys/integrations/microsoft";
import type { MicrosoftAuthConfig } from "@neogesys/integrations/microsoft";
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

function toMicrosoftConfig(creds: Record<string, string>): MicrosoftAuthConfig {
	return {
		clientId: creds.clientId ?? "",
		clientSecret: creds.clientSecret ?? "",
		tenantId: creds.azureTenantId ?? "common",
		redirectUri: creds.redirectUri ?? "",
		refreshToken: creds.refreshToken ?? "",
		accessToken: creds.accessToken,
	};
}

async function getCalendarClient(
	tenantId: string,
	vault: { getCredentials(t: string, p: string): Promise<Record<string, string> | null> },
): Promise<MicrosoftOAuthClient> {
	const credentials = await vault.getCredentials(tenantId, "microsoft_calendar");
	if (!credentials) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "Microsoft Calendar non configurato. Completare prima il flusso OAuth.",
		});
	}
	return new MicrosoftOAuthClient(toMicrosoftConfig(credentials));
}

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

async function graphFetch(
	client: MicrosoftOAuthClient,
	path: string,
	init?: RequestInit,
): Promise<Response> {
	const token = await client.getAccessToken();
	return fetch(`${GRAPH_BASE}${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
			...init?.headers,
		},
	});
}

// ─── Router ─────────────────────────────────────────────────────────────────

export const microsoftCalendarRouter = router({
	/**
	 * Start the OAuth flow for Microsoft Calendar.
	 */
	startOAuth: adminProcedure
		.input(
			z.object({
				clientId: z.string().min(1),
				clientSecret: z.string().min(1),
				azureTenantId: z.string().default("common"),
				redirectUri: z.string().url(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			requireTenant(ctx.tenant?.id);

			const client = new MicrosoftOAuthClient({
				clientId: input.clientId,
				clientSecret: input.clientSecret,
				tenantId: input.azureTenantId,
				redirectUri: input.redirectUri,
				refreshToken: "",
			});

			const authUrl = client.getAuthUrl([...CALENDAR_SCOPES]);
			return { authUrl };
		}),

	/**
	 * Handle the OAuth callback: exchange code and persist tokens.
	 */
	handleCallback: adminProcedure
		.input(
			z.object({
				code: z.string().min(1),
				clientId: z.string().min(1),
				clientSecret: z.string().min(1),
				azureTenantId: z.string().default("common"),
				redirectUri: z.string().url(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);

			const client = new MicrosoftOAuthClient({
				clientId: input.clientId,
				clientSecret: input.clientSecret,
				tenantId: input.azureTenantId,
				redirectUri: input.redirectUri,
				refreshToken: "",
			});

			const config = await client.exchangeCode(input.code, [...CALENDAR_SCOPES]);

			await ctx.vault.setCredentials(tenantId, "microsoft_calendar", "calendar", {
				clientId: input.clientId,
				clientSecret: input.clientSecret,
				azureTenantId: input.azureTenantId,
				redirectUri: input.redirectUri,
				refreshToken: config.refreshToken,
				accessToken: config.accessToken ?? "",
			});

			return { success: true };
		}),

	/**
	 * List all calendars for the authenticated user.
	 */
	listCalendars: protectedProcedure.query(async ({ ctx }) => {
		const tenantId = requireTenant(ctx.tenant?.id);
		const client = await getCalendarClient(tenantId, ctx.vault);

		const response = await graphFetch(client, "/me/calendars");
		const data = (await response.json()) as { value?: Array<Record<string, unknown>> };

		return {
			calendars: (data.value ?? []) as Array<Record<string, unknown>>,
		};
	}),

	/**
	 * List events from a calendar with optional date range filter.
	 */
	listEvents: protectedProcedure
		.input(
			z.object({
				calendarId: z.string().optional(),
				startDateTime: z.string().datetime().optional(),
				endDateTime: z.string().datetime().optional(),
				top: z.number().int().min(1).max(500).default(50),
			}),
		)
		.query(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			const client = await getCalendarClient(tenantId, ctx.vault);

			const basePath = input.calendarId ? `/me/calendars/${input.calendarId}/events` : "/me/events";

			const params = new URLSearchParams({
				$top: String(input.top),
				$orderby: "start/dateTime",
			});

			if (input.startDateTime) {
				params.set("$filter", `start/dateTime ge '${input.startDateTime}'`);
			}

			const response = await graphFetch(client, `${basePath}?${params}`);
			const data = (await response.json()) as {
				value?: Array<Record<string, unknown>>;
				"@odata.nextLink"?: string;
			};

			return {
				events: (data.value ?? []) as Array<Record<string, unknown>>,
				nextLink: data["@odata.nextLink"] as string | undefined,
			};
		}),

	/**
	 * Create a new calendar event.
	 */
	createEvent: adminProcedure
		.input(
			z.object({
				calendarId: z.string().optional(),
				event: z.object({
					subject: z.string().min(1),
					body: z
						.object({
							contentType: z.string().default("HTML"),
							content: z.string(),
						})
						.optional(),
					start: z.object({
						dateTime: z.string(),
						timeZone: z.string().default("Europe/Rome"),
					}),
					end: z.object({
						dateTime: z.string(),
						timeZone: z.string().default("Europe/Rome"),
					}),
					location: z.object({ displayName: z.string() }).optional(),
					attendees: z
						.array(
							z.object({
								email: z.string().email(),
								name: z.string().optional(),
								type: z.string().default("required"),
							}),
						)
						.optional(),
					isAllDay: z.boolean().optional(),
					categories: z.array(z.string()).optional(),
				}),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			const client = await getCalendarClient(tenantId, ctx.vault);

			const basePath = input.calendarId ? `/me/calendars/${input.calendarId}/events` : "/me/events";

			const eventBody = {
				...input.event,
				attendees: input.event.attendees?.map((a) => ({
					emailAddress: { address: a.email, name: a.name },
					type: a.type,
				})),
			};

			const response = await graphFetch(client, basePath, {
				method: "POST",
				body: JSON.stringify(eventBody),
			});

			if (!response.ok) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Errore creazione evento: ${response.statusText}`,
				});
			}

			return response.json();
		}),

	/**
	 * Update an existing calendar event.
	 */
	updateEvent: adminProcedure
		.input(
			z.object({
				eventId: z.string().min(1),
				event: z.object({
					subject: z.string().optional(),
					body: z
						.object({
							contentType: z.string().default("HTML"),
							content: z.string(),
						})
						.optional(),
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
					location: z.object({ displayName: z.string() }).optional(),
					categories: z.array(z.string()).optional(),
				}),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			const client = await getCalendarClient(tenantId, ctx.vault);

			const response = await graphFetch(client, `/me/events/${input.eventId}`, {
				method: "PATCH",
				body: JSON.stringify(input.event),
			});

			if (!response.ok) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Errore aggiornamento evento: ${response.statusText}`,
				});
			}

			return response.json();
		}),

	/**
	 * Delete a calendar event.
	 */
	deleteEvent: adminProcedure
		.input(z.object({ eventId: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			const client = await getCalendarClient(tenantId, ctx.vault);

			const response = await graphFetch(client, `/me/events/${input.eventId}`, {
				method: "DELETE",
			});

			if (!response.ok && response.status !== 204) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Errore eliminazione evento: ${response.statusText}`,
				});
			}

			return { success: true };
		}),

	/**
	 * Sync corsi (courses) to Microsoft Calendar as recurring events.
	 */
	syncCorsi: adminProcedure
		.input(
			z.object({
				calendarId: z.string().optional(),
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
			const client = await getCalendarClient(tenantId, ctx.vault);

			const basePath = input.calendarId ? `/me/calendars/${input.calendarId}/events` : "/me/events";

			const daysMap = [
				"sunday",
				"monday",
				"tuesday",
				"wednesday",
				"thursday",
				"friday",
				"saturday",
			];
			const results: Array<{ corsoId: string; eventIds: string[] }> = [];

			for (const corso of input.corsi) {
				const eventIds: string[] = [];

				for (const lezione of corso.lezioni) {
					const eventBody = {
						subject: corso.nome,
						body: {
							contentType: "HTML",
							content: corso.descrizione ?? `Corso: ${corso.nome}`,
						},
						start: {
							dateTime: `${corso.dataInizio}T${lezione.oraInizio}:00`,
							timeZone: "Europe/Rome",
						},
						end: {
							dateTime: `${corso.dataInizio}T${lezione.oraFine}:00`,
							timeZone: "Europe/Rome",
						},
						location: corso.luogo ? { displayName: corso.luogo } : undefined,
						recurrence: {
							pattern: {
								type: "weekly",
								interval: 1,
								daysOfWeek: [daysMap[lezione.giorno]],
							},
							range: {
								type: "endDate",
								startDate: corso.dataInizio,
								endDate: corso.dataFine,
							},
						},
					};

					const response = await graphFetch(client, basePath, {
						method: "POST",
						body: JSON.stringify(eventBody),
					});

					if (response.ok) {
						const data = (await response.json()) as { id?: string };
						eventIds.push(data.id as string);
					}
				}

				results.push({ corsoId: corso.id, eventIds });
			}

			return { synced: results, count: results.length };
		}),

	/**
	 * Sync one-off eventi to Microsoft Calendar.
	 */
	syncEventi: adminProcedure
		.input(
			z.object({
				calendarId: z.string().optional(),
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
			const client = await getCalendarClient(tenantId, ctx.vault);

			const basePath = input.calendarId ? `/me/calendars/${input.calendarId}/events` : "/me/events";

			const results: Array<{ eventoId: string; outlookEventId: string }> = [];

			for (const evento of input.eventi) {
				const eventBody = {
					subject: evento.titolo,
					body: evento.descrizione
						? { contentType: "HTML", content: evento.descrizione }
						: undefined,
					start: { dateTime: evento.dataInizio, timeZone: "Europe/Rome" },
					end: { dateTime: evento.dataFine, timeZone: "Europe/Rome" },
					location: evento.luogo ? { displayName: evento.luogo } : undefined,
					attendees: evento.partecipanti?.map((p) => ({
						emailAddress: { address: p.email, name: p.nome },
						type: "required",
					})),
				};

				const response = await graphFetch(client, basePath, {
					method: "POST",
					body: JSON.stringify(eventBody),
				});

				if (response.ok) {
					const data = (await response.json()) as { id?: string };
					results.push({ eventoId: evento.id, outlookEventId: data.id as string });
				}
			}

			return { synced: results, count: results.length };
		}),

	/**
	 * Setup a subscription (webhook) for calendar change notifications.
	 */
	setupSubscription: adminProcedure
		.input(
			z.object({
				webhookUrl: z.string().url(),
				calendarId: z.string().optional(),
				expirationMinutes: z.number().int().min(1).max(4230).default(4230),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			const client = await getCalendarClient(tenantId, ctx.vault);

			const resource = input.calendarId ? `/me/calendars/${input.calendarId}/events` : "/me/events";

			const expiration = new Date(Date.now() + input.expirationMinutes * 60 * 1000).toISOString();

			const response = await graphFetch(client, "/subscriptions", {
				method: "POST",
				body: JSON.stringify({
					changeType: "created,updated,deleted",
					notificationUrl: input.webhookUrl,
					resource,
					expirationDateTime: expiration,
					clientState: `neogesys_${tenantId}`,
				}),
			});

			if (!response.ok) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Errore creazione subscription: ${response.statusText}`,
				});
			}

			return response.json();
		}),
});
