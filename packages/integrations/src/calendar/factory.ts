import { db } from "@neogesys/db";
import { tenantIntegrations } from "@neogesys/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import type { GoogleCalendarService } from "../google/calendar";
import { getGoogleCalendarProvider } from "../google/factory";
import type { Calendar, CalendarEvent, CreateCalendarEvent } from "../google/types";
import type { OutlookCalendarService } from "../microsoft/calendar";
import { getOutlookCalendarProvider } from "../microsoft/factory";
import type { OutlookCalendar, OutlookEvent } from "../microsoft/types";
import type {
	CalendarProvider,
	CalendarProviderType,
	CreateUnifiedEvent,
	SyncInfo,
	UnifiedCalendar,
	UnifiedCalendarEvent,
	UnifiedCalendarEventList,
	UnifiedCalendarList,
} from "./types";

// ─── Provider Detection ────────────────────────────────────────────────────

async function detectCalendarProvider(tenantId: string): Promise<CalendarProviderType> {
	const integrations = await db
		.select({ provider: tenantIntegrations.provider })
		.from(tenantIntegrations)
		.where(
			and(
				eq(tenantIntegrations.tenantId, tenantId),
				inArray(tenantIntegrations.provider, ["google_calendar", "microsoft_calendar"]),
				eq(tenantIntegrations.attivo, true),
			),
		)
		.limit(1);

	if (integrations.length === 0) {
		throw new Error(
			`Nessuna integrazione calendario attiva trovata per il tenant ${tenantId}. Configurare Google Calendar o Microsoft Calendar nelle impostazioni.`,
		);
	}

	const provider = integrations[0]?.provider;
	if (provider === "google_calendar") return "google";
	if (provider === "microsoft_calendar") return "microsoft";
	throw new Error(`Provider calendario non supportato: ${provider}`);
}

// ─── Google Calendar Adapter ───────────────────────────────────────────────

function toUnifiedGoogleCalendar(cal: Calendar): UnifiedCalendar {
	return {
		id: cal.id,
		name: cal.summary,
		description: cal.description,
		timeZone: cal.timeZone,
		color: cal.backgroundColor,
		isPrimary: cal.primary,
		provider: "google",
	};
}

function toUnifiedGoogleEvent(event: CalendarEvent, calendarId: string): UnifiedCalendarEvent {
	return {
		id: event.id,
		calendarId,
		summary: event.summary,
		description: event.description,
		location: event.location,
		start: event.start,
		end: event.end,
		attendees: event.attendees.map((a) => ({
			email: a.email,
			displayName: a.displayName,
			responseStatus: a.responseStatus,
		})),
		isAllDay: !event.start.dateTime,
		isRecurring: !!event.recurringEventId || event.recurrence.length > 0,
		status: event.status,
		htmlLink: event.htmlLink,
		provider: "google",
		providerEventId: event.id,
	};
}

class GoogleCalendarAdapter implements CalendarProvider {
	readonly providerType: CalendarProviderType = "google";

	constructor(private readonly service: GoogleCalendarService) {}

	async listCalendars(): Promise<UnifiedCalendarList> {
		const result = await this.service.listCalendars();
		return { calendars: result.calendars.map(toUnifiedGoogleCalendar) };
	}

	async listEvents(
		calendarId: string,
		timeMin?: Date,
		timeMax?: Date,
		query?: string,
	): Promise<UnifiedCalendarEventList> {
		const result = await this.service.listEvents(calendarId, timeMin, timeMax, query);
		return {
			events: result.events.map((e) => toUnifiedGoogleEvent(e, calendarId)),
			nextPageToken: result.nextPageToken,
		};
	}

	async createEvent(calendarId: string, event: CreateUnifiedEvent): Promise<UnifiedCalendarEvent> {
		const googleEvent: CreateCalendarEvent = {
			summary: event.summary,
			description: event.description,
			location: event.location,
			start: {
				dateTime: event.start.dateTime,
				timeZone: event.start.timeZone ?? "Europe/Rome",
			},
			end: {
				dateTime: event.end.dateTime,
				timeZone: event.end.timeZone ?? "Europe/Rome",
			},
			attendees: event.attendees?.map((a) => ({
				email: a.email,
				displayName: a.displayName,
			})),
			recurrence: event.recurrence,
			colorId: event.colorId,
		};

		const created = await this.service.createEvent(calendarId, googleEvent);
		return toUnifiedGoogleEvent(created, calendarId);
	}

	async updateEvent(
		calendarId: string,
		eventId: string,
		event: Partial<CreateUnifiedEvent>,
	): Promise<UnifiedCalendarEvent> {
		const patch: Partial<CreateCalendarEvent> = {};
		if (event.summary) patch.summary = event.summary;
		if (event.description !== undefined) patch.description = event.description;
		if (event.location !== undefined) patch.location = event.location;
		if (event.start) {
			patch.start = {
				dateTime: event.start.dateTime,
				timeZone: event.start.timeZone ?? "Europe/Rome",
			};
		}
		if (event.end) {
			patch.end = {
				dateTime: event.end.dateTime,
				timeZone: event.end.timeZone ?? "Europe/Rome",
			};
		}
		if (event.attendees) {
			patch.attendees = event.attendees.map((a) => ({
				email: a.email,
				displayName: a.displayName,
			}));
		}
		if (event.colorId) patch.colorId = event.colorId;

		const updated = await this.service.updateEvent(calendarId, eventId, patch);
		return toUnifiedGoogleEvent(updated, calendarId);
	}

	async deleteEvent(calendarId: string, eventId: string): Promise<void> {
		await this.service.deleteEvent(calendarId, eventId);
	}

	async setupSync(calendarId: string, webhookUrl: string): Promise<SyncInfo> {
		const watch = await this.service.watchEvents(calendarId, webhookUrl);
		return {
			channelId: watch.channelId,
			resourceId: watch.resourceId,
			expiration: new Date(watch.expiration),
		};
	}

	async stopSync(syncInfo: SyncInfo): Promise<void> {
		if (syncInfo.channelId && syncInfo.resourceId) {
			await this.service.stopWatch(syncInfo.channelId, syncInfo.resourceId);
		}
	}
}

// ─── Microsoft Calendar Adapter ────────────────────────────────────────────

function toUnifiedOutlookCalendar(cal: OutlookCalendar): UnifiedCalendar {
	return {
		id: cal.id,
		name: cal.name,
		description: undefined,
		timeZone: "Europe/Rome",
		color: cal.color,
		isPrimary: cal.isDefaultCalendar,
		provider: "microsoft",
	};
}

function toUnifiedOutlookEvent(event: OutlookEvent, calendarId: string): UnifiedCalendarEvent {
	return {
		id: event.id,
		calendarId,
		summary: event.subject,
		description: event.body.content,
		location: event.location.displayName || undefined,
		start: event.start,
		end: event.end,
		attendees: event.attendees.map((a) => ({
			email: a.emailAddress.address,
			displayName: a.emailAddress.name,
			responseStatus: a.status?.response,
		})),
		isAllDay: event.isAllDay,
		isRecurring: event.recurrence !== null,
		status: "confirmed",
		htmlLink: event.webLink,
		provider: "microsoft",
		providerEventId: event.id,
	};
}

class MicrosoftCalendarAdapter implements CalendarProvider {
	readonly providerType: CalendarProviderType = "microsoft";

	constructor(private readonly service: OutlookCalendarService) {}

	async listCalendars(): Promise<UnifiedCalendarList> {
		const result = await this.service.listCalendars();
		return { calendars: result.calendars.map(toUnifiedOutlookCalendar) };
	}

	async listEvents(
		calendarId: string,
		timeMin?: Date,
		timeMax?: Date,
		_query?: string,
	): Promise<UnifiedCalendarEventList> {
		const result = await this.service.listEvents(calendarId, timeMin, timeMax);
		return {
			events: result.events.map((e) => toUnifiedOutlookEvent(e, calendarId)),
			nextPageToken: result.nextLink,
		};
	}

	async createEvent(calendarId: string, event: CreateUnifiedEvent): Promise<UnifiedCalendarEvent> {
		const outlookEvent = {
			subject: event.summary,
			body: event.description ? { contentType: "HTML", content: event.description } : undefined,
			start: {
				dateTime: event.start.dateTime,
				timeZone: event.start.timeZone ?? "Europe/Rome",
			},
			end: {
				dateTime: event.end.dateTime,
				timeZone: event.end.timeZone ?? "Europe/Rome",
			},
			location: event.location ? { displayName: event.location } : undefined,
			attendees: event.attendees?.map((a) => ({
				email: a.email,
				name: a.displayName,
			})),
			isAllDay: event.isAllDay,
		};

		const created = await this.service.createEvent(outlookEvent, calendarId);
		return toUnifiedOutlookEvent(created, calendarId);
	}

	async updateEvent(
		_calendarId: string,
		eventId: string,
		event: Partial<CreateUnifiedEvent>,
	): Promise<UnifiedCalendarEvent> {
		const patch: Record<string, unknown> = {};
		if (event.summary) patch.subject = event.summary;
		if (event.description !== undefined) {
			patch.body = { contentType: "HTML", content: event.description };
		}
		if (event.location !== undefined) {
			patch.location = { displayName: event.location };
		}
		if (event.start) {
			patch.start = {
				dateTime: event.start.dateTime,
				timeZone: event.start.timeZone ?? "Europe/Rome",
			};
		}
		if (event.end) {
			patch.end = {
				dateTime: event.end.dateTime,
				timeZone: event.end.timeZone ?? "Europe/Rome",
			};
		}

		const updated = await this.service.updateEvent(
			eventId,
			patch as Parameters<typeof this.service.updateEvent>[1],
		);
		return toUnifiedOutlookEvent(updated, _calendarId);
	}

	async deleteEvent(_calendarId: string, eventId: string): Promise<void> {
		await this.service.deleteEvent(eventId);
	}

	async setupSync(calendarId: string, webhookUrl: string): Promise<SyncInfo> {
		const resource = calendarId ? `/me/calendars/${calendarId}/events` : "/me/events";

		const sub = await this.service.subscribeToChanges(webhookUrl, resource);
		return {
			subscriptionId: sub.id,
			expiration: new Date(sub.expirationDateTime),
		};
	}

	async stopSync(syncInfo: SyncInfo): Promise<void> {
		if (syncInfo.subscriptionId) {
			await this.service.deleteSubscription(syncInfo.subscriptionId);
		}
	}
}

// ─── Factory ───────────────────────────────────────────────────────────────

/**
 * Get the unified CalendarProvider for a tenant.
 *
 * Automatically detects which calendar backend (Google or Microsoft) is
 * configured for the tenant, resolves credentials from the vault, and
 * returns a provider instance wrapped in the unified CalendarProvider
 * interface.
 */
export async function getCalendarProvider(tenantId: string): Promise<CalendarProvider> {
	const providerType = await detectCalendarProvider(tenantId);

	if (providerType === "google") {
		const googleService = await getGoogleCalendarProvider(tenantId);
		return new GoogleCalendarAdapter(googleService);
	}

	const outlookService = await getOutlookCalendarProvider(tenantId);
	return new MicrosoftCalendarAdapter(outlookService);
}
