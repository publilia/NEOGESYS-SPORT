import { getCalendarProvider } from "./factory";
import type { CalendarProvider, CreateUnifiedEvent, UnifiedCalendarEvent } from "./types";

// ─── Types ─────────────────────────────────────────────────────────────────

interface CorsoForSync {
	id: string;
	nome: string;
	descrizione?: string;
	luogo?: string;
	disciplina?: string;
	lezioni: Array<{
		giorno: number; // 0 = Sunday, 6 = Saturday
		oraInizio: string; // "HH:mm"
		oraFine: string; // "HH:mm"
	}>;
	dataInizio: string; // "YYYY-MM-DD"
	dataFine: string; // "YYYY-MM-DD"
}

interface EventoForSync {
	id: string;
	titolo: string;
	descrizione?: string;
	luogo?: string;
	dataInizio: string; // ISO 8601
	dataFine: string; // ISO 8601
	partecipanti?: Array<{ email: string; nome?: string }>;
}

interface SyncResult {
	synced: number;
	errors: number;
	details: Array<{ id: string; calendarEventId?: string; error?: string }>;
}

interface WebhookPayload {
	provider: "google" | "microsoft";
	channelId?: string;
	resourceId?: string;
	subscriptionId?: string;
	tenantId: string;
	calendarId: string;
}

// ─── CalendarSyncService ───────────────────────────────────────────────────

/**
 * Service that synchronises NeoGesys Sport domain objects (corsi, eventi)
 * to the tenant's active calendar provider (Google or Microsoft).
 *
 * Used both from tRPC API handlers and from scheduled jobs.
 */
export class CalendarSyncService {
	private provider: CalendarProvider | null = null;

	constructor(private readonly tenantId: string) {}

	// ── Lazy provider resolution ───────────────────────────────────────────

	private async getProvider(): Promise<CalendarProvider> {
		if (!this.provider) {
			this.provider = await getCalendarProvider(this.tenantId);
		}
		return this.provider;
	}

	// ── Corso sync ─────────────────────────────────────────────────────────

	/**
	 * Sync a list of corsi to the tenant's calendar.
	 *
	 * Each lezione (weekly lesson) becomes a recurring event in the calendar.
	 * Uses RRULE for Google and the recurrence pattern for Outlook.
	 */
	async syncCorsiToCalendar(calendarId: string, corsi: CorsoForSync[]): Promise<SyncResult> {
		const provider = await this.getProvider();
		const daysRRule = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

		let synced = 0;
		let errors = 0;
		const details: SyncResult["details"] = [];

		for (const corso of corsi) {
			try {
				for (const lezione of corso.lezioni) {
					const event: CreateUnifiedEvent = {
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
							`RRULE:FREQ=WEEKLY;BYDAY=${daysRRule[lezione.giorno]};UNTIL=${corso.dataFine.replace(/-/g, "")}T235959Z`,
						],
					};

					const created = await provider.createEvent(calendarId, event);
					details.push({
						id: corso.id,
						calendarEventId: created.id,
					});
				}

				synced++;
			} catch (error) {
				errors++;
				details.push({
					id: corso.id,
					error: error instanceof Error ? error.message : "Errore sconosciuto",
				});
			}
		}

		return { synced, errors, details };
	}

	// ── Evento sync ────────────────────────────────────────────────────────

	/**
	 * Sync one-off eventi to the tenant's calendar.
	 */
	async syncEventiToCalendar(calendarId: string, eventi: EventoForSync[]): Promise<SyncResult> {
		const provider = await this.getProvider();

		let synced = 0;
		let errors = 0;
		const details: SyncResult["details"] = [];

		for (const evento of eventi) {
			try {
				const event: CreateUnifiedEvent = {
					summary: evento.titolo,
					description: evento.descrizione,
					location: evento.luogo,
					start: { dateTime: evento.dataInizio, timeZone: "Europe/Rome" },
					end: { dateTime: evento.dataFine, timeZone: "Europe/Rome" },
					attendees: evento.partecipanti?.map((p) => ({
						email: p.email,
						displayName: p.nome,
					})),
				};

				const created = await provider.createEvent(calendarId, event);
				synced++;
				details.push({
					id: evento.id,
					calendarEventId: created.id,
				});
			} catch (error) {
				errors++;
				details.push({
					id: evento.id,
					error: error instanceof Error ? error.message : "Errore sconosciuto",
				});
			}
		}

		return { synced, errors, details };
	}

	// ── Webhook handling ───────────────────────────────────────────────────

	/**
	 * Handle an incoming webhook notification from Google or Microsoft.
	 *
	 * This is called when a push notification arrives indicating that
	 * events have changed in the calendar. The method fetches the latest
	 * events and returns them for processing.
	 */
	async handleWebhookNotification(payload: WebhookPayload): Promise<{
		events: UnifiedCalendarEvent[];
		provider: string;
	}> {
		const provider = await this.getProvider();

		// Fetch recent events (last 24 hours to catch changes)
		const timeMin = new Date();
		timeMin.setHours(timeMin.getHours() - 24);

		const timeMax = new Date();
		timeMax.setMonth(timeMax.getMonth() + 3);

		const result = await provider.listEvents(payload.calendarId, timeMin, timeMax);

		return {
			events: result.events,
			provider: provider.providerType,
		};
	}
}
