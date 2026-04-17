import { MicrosoftOAuthClient, CALENDAR_SCOPES, MicrosoftAuthError } from "./auth";
import type {
  MicrosoftAuthConfig,
  OutlookCalendar,
  OutlookCalendarList,
  OutlookCalendarProvider,
  OutlookEvent,
  OutlookEventList,
  CreateOutlookEvent,
  Subscription,
} from "./types";

// ─── Constants ──────────────────────────────────────────────────────────────

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const DEFAULT_TIMEZONE = "Europe/Rome";

/** Category color mapping for common sport disciplines. */
const DISCIPLINE_COLORS: Record<string, string> = {
  calcio: "preset0",       // Red
  nuoto: "preset1",        // Orange
  pallavolo: "preset2",    // Brown
  basket: "preset3",       // Yellow
  tennis: "preset4",       // Green
  atletica: "preset5",     // Teal
  ginnastica: "preset6",   // Olive
  danza: "preset7",        // Blue
  arti_marziali: "preset8", // Purple
  fitness: "preset9",      // Cranberry
};

// ─── Helpers ────────────────────────────────────────────────────────────────

interface GraphErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
}

async function throwIfGraphError(response: Response, context: string): Promise<void> {
  if (response.ok) return;

  let body: GraphErrorBody | undefined;
  try {
    body = (await response.json()) as GraphErrorBody;
  } catch {
    // body not parseable
  }

  const code = body?.error?.code ?? String(response.status);
  const message = body?.error?.message ?? response.statusText;
  throw new MicrosoftAuthError(`${context}: [${code}] ${message}`, code, response.status);
}

function toISOWithTimezone(date: Date, timeZone: string = DEFAULT_TIMEZONE): { dateTime: string; timeZone: string } {
  return {
    dateTime: date.toISOString().replace("Z", ""),
    timeZone,
  };
}

function mapEvent(item: Record<string, unknown>): OutlookEvent {
  return {
    id: item.id as string,
    subject: (item.subject as string) ?? "",
    body: (item.body as OutlookEvent["body"]) ?? { contentType: "text", content: "" },
    start: item.start as OutlookEvent["start"],
    end: item.end as OutlookEvent["end"],
    location: (item.location as OutlookEvent["location"]) ?? { displayName: "" },
    attendees: (item.attendees as OutlookEvent["attendees"]) ?? [],
    isAllDay: (item.isAllDay as boolean) ?? false,
    recurrence: (item.recurrence as OutlookEvent["recurrence"]) ?? null,
    webLink: (item.webLink as string) ?? "",
    categories: (item.categories as string[]) ?? [],
  };
}

function mapCalendar(item: Record<string, unknown>): OutlookCalendar {
  return {
    id: item.id as string,
    name: (item.name as string) ?? "",
    color: (item.color as string) ?? "",
    isDefaultCalendar: (item.isDefaultCalendar as boolean) ?? false,
    canEdit: (item.canEdit as boolean) ?? false,
  };
}

function formatCreateEvent(event: CreateOutlookEvent): Record<string, unknown> {
  const body: Record<string, unknown> = {
    subject: event.subject,
    start: event.start,
    end: event.end,
    isAllDay: event.isAllDay ?? false,
  };

  if (event.body) {
    body.body = event.body;
  }

  if (event.location) {
    body.location = event.location;
  }

  if (event.attendees?.length) {
    body.attendees = event.attendees.map((a) => ({
      emailAddress: { address: a.email, name: a.name ?? a.email },
      type: a.type ?? "required",
    }));
  }

  if (event.recurrence) {
    body.recurrence = event.recurrence;
  }

  if (event.categories?.length) {
    body.categories = event.categories;
  }

  if (event.showAs) {
    body.showAs = event.showAs;
  }

  if (event.importance) {
    body.importance = event.importance;
  }

  return body;
}

// ─── Service ────────────────────────────────────────────────────────────────

/**
 * Outlook Calendar service using Microsoft Graph API v1.0.
 *
 * Provides CRUD for calendars and events, recurrence patterns, category color mapping,
 * sync helpers for NeoGesys Sport domain entities, and Graph webhook subscriptions.
 */
export class OutlookCalendarService implements OutlookCalendarProvider {
  private readonly auth: MicrosoftOAuthClient;

  constructor(config: MicrosoftAuthConfig) {
    this.auth = new MicrosoftOAuthClient(config);
  }

  // ── Auth helpers ────────────────────────────────────────────────────────

  /** Generate the Microsoft OAuth2 authorization URL for calendar scopes. */
  getAuthUrl(state?: string): string {
    return this.auth.getAuthUrl([...CALENDAR_SCOPES], state);
  }

  /** Exchange an authorization code for tokens. */
  async handleCallback(code: string): Promise<MicrosoftAuthConfig> {
    return this.auth.exchangeCode(code, [...CALENDAR_SCOPES]);
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private async headers(): Promise<Record<string, string>> {
    const token = await this.auth.getAccessToken();
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: `outlook.timezone="${DEFAULT_TIMEZONE}"`,
    };
  }

  // ── Calendar Operations ─────────────────────────────────────────────────

  async listCalendars(): Promise<OutlookCalendarList> {
    const h = await this.headers();
    const res = await fetch(`${GRAPH_BASE}/me/calendars`, { headers: h });
    await throwIfGraphError(res, "Elenco calendari Outlook");

    const data = (await res.json()) as Record<string, unknown>;
    const items = (data.value as Array<Record<string, unknown>>) ?? [];

    return {
      calendars: items.map(mapCalendar),
    };
  }

  async getCalendar(calendarId: string): Promise<OutlookCalendar> {
    const h = await this.headers();
    const res = await fetch(`${GRAPH_BASE}/me/calendars/${calendarId}`, { headers: h });
    await throwIfGraphError(res, "Recupero calendario Outlook");

    const data = (await res.json()) as Record<string, unknown>;
    return mapCalendar(data);
  }

  // ── Event Operations ────────────────────────────────────────────────────

  async listEvents(
    calendarId?: string,
    startDateTime?: Date,
    endDateTime?: Date,
    filter?: string,
  ): Promise<OutlookEventList> {
    const h = await this.headers();
    const baseUrl = calendarId
      ? `${GRAPH_BASE}/me/calendars/${calendarId}/events`
      : `${GRAPH_BASE}/me/events`;

    const params = new URLSearchParams({ $top: "50", $orderby: "start/dateTime" });

    if (startDateTime && endDateTime) {
      // Use calendarView for date range queries
      const viewUrl = calendarId
        ? `${GRAPH_BASE}/me/calendars/${calendarId}/calendarView`
        : `${GRAPH_BASE}/me/calendarView`;

      params.set("startDateTime", startDateTime.toISOString());
      params.set("endDateTime", endDateTime.toISOString());

      if (filter) {
        params.set("$filter", filter);
      }

      const res = await fetch(`${viewUrl}?${params.toString()}`, { headers: h });
      await throwIfGraphError(res, "Elenco eventi Outlook (calendarView)");

      const data = (await res.json()) as Record<string, unknown>;
      const items = (data.value as Array<Record<string, unknown>>) ?? [];

      return {
        events: items.map(mapEvent),
        nextLink: data["@odata.nextLink"] as string | undefined,
      };
    }

    if (filter) {
      params.set("$filter", filter);
    }

    const res = await fetch(`${baseUrl}?${params.toString()}`, { headers: h });
    await throwIfGraphError(res, "Elenco eventi Outlook");

    const data = (await res.json()) as Record<string, unknown>;
    const items = (data.value as Array<Record<string, unknown>>) ?? [];

    return {
      events: items.map(mapEvent),
      nextLink: data["@odata.nextLink"] as string | undefined,
    };
  }

  async getEvent(eventId: string): Promise<OutlookEvent> {
    const h = await this.headers();
    const res = await fetch(`${GRAPH_BASE}/me/events/${eventId}`, { headers: h });
    await throwIfGraphError(res, "Recupero evento Outlook");

    const data = (await res.json()) as Record<string, unknown>;
    return mapEvent(data);
  }

  async createEvent(
    event: CreateOutlookEvent,
    calendarId?: string,
  ): Promise<OutlookEvent> {
    const h = await this.headers();
    const url = calendarId
      ? `${GRAPH_BASE}/me/calendars/${calendarId}/events`
      : `${GRAPH_BASE}/me/events`;

    const body = formatCreateEvent(event);

    const res = await fetch(url, {
      method: "POST",
      headers: h,
      body: JSON.stringify(body),
    });

    await throwIfGraphError(res, "Creazione evento Outlook");
    const data = (await res.json()) as Record<string, unknown>;
    return mapEvent(data);
  }

  async updateEvent(
    eventId: string,
    event: Partial<CreateOutlookEvent>,
  ): Promise<OutlookEvent> {
    const h = await this.headers();

    const body = formatCreateEvent(event as CreateOutlookEvent);

    const res = await fetch(`${GRAPH_BASE}/me/events/${eventId}`, {
      method: "PATCH",
      headers: h,
      body: JSON.stringify(body),
    });

    await throwIfGraphError(res, "Aggiornamento evento Outlook");
    const data = (await res.json()) as Record<string, unknown>;
    return mapEvent(data);
  }

  async deleteEvent(eventId: string): Promise<void> {
    const h = await this.headers();
    const res = await fetch(`${GRAPH_BASE}/me/events/${eventId}`, {
      method: "DELETE",
      headers: h,
    });

    if (res.status !== 204 && !res.ok) {
      await throwIfGraphError(res, "Eliminazione evento Outlook");
    }
  }

  // ── Subscriptions (Graph Webhooks) ──────────────────────────────────────

  async subscribeToChanges(
    webhookUrl: string,
    resource: string,
  ): Promise<Subscription> {
    const h = await this.headers();

    // Graph subscriptions for calendar events expire after max 4230 minutes (~3 days)
    const expirationDateTime = new Date(
      Date.now() + 3 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const res = await fetch(`${GRAPH_BASE}/subscriptions`, {
      method: "POST",
      headers: h,
      body: JSON.stringify({
        changeType: "created,updated,deleted",
        notificationUrl: webhookUrl,
        resource,
        expirationDateTime,
        clientState: "neogesys-sport-calendar-sync",
      }),
    });

    await throwIfGraphError(res, "Creazione sottoscrizione webhook");
    const data = (await res.json()) as Record<string, unknown>;

    return {
      id: data.id as string,
      resource: data.resource as string,
      changeType: data.changeType as string,
      expirationDateTime: data.expirationDateTime as string,
    };
  }

  async deleteSubscription(subscriptionId: string): Promise<void> {
    const h = await this.headers();
    const res = await fetch(`${GRAPH_BASE}/subscriptions/${subscriptionId}`, {
      method: "DELETE",
      headers: h,
    });

    if (res.status !== 204 && !res.ok) {
      await throwIfGraphError(res, "Eliminazione sottoscrizione webhook");
    }
  }

  // ── Sync Helpers ────────────────────────────────────────────────────────

  /**
   * Sync course schedule entries to Outlook Calendar.
   *
   * Each corso becomes a recurring or single event in the specified calendar.
   */
  async syncCorsiToCalendar(
    corsi: Array<{
      id: string;
      nome: string;
      descrizione?: string;
      disciplina?: string;
      dataInizio: Date;
      dataFine: Date;
      orarioInizio: string; // "HH:mm"
      orarioFine: string;   // "HH:mm"
      giorniSettimana?: string[]; // ["monday", "wednesday", ...]
      luogo?: string;
      istruttore?: string;
    }>,
    calendarId?: string,
  ): Promise<OutlookEvent[]> {
    const created: OutlookEvent[] = [];

    for (const corso of corsi) {
      const categories = corso.disciplina
        ? [corso.disciplina]
        : [];

      const startDate = corso.dataInizio;
      const [startH, startM] = corso.orarioInizio.split(":").map(Number);
      startDate.setHours(startH, startM, 0, 0);

      const endDate = new Date(startDate);
      const [endH, endM] = corso.orarioFine.split(":").map(Number);
      endDate.setHours(endH, endM, 0, 0);

      const event: CreateOutlookEvent = {
        subject: `${corso.nome}${corso.istruttore ? ` - ${corso.istruttore}` : ""}`,
        body: corso.descrizione
          ? { contentType: "text", content: corso.descrizione }
          : undefined,
        start: toISOWithTimezone(startDate),
        end: toISOWithTimezone(endDate),
        location: corso.luogo ? { displayName: corso.luogo } : undefined,
        categories,
        showAs: "busy",
      };

      // Add weekly recurrence if days are specified
      if (corso.giorniSettimana?.length) {
        event.recurrence = {
          pattern: {
            type: "weekly",
            interval: 1,
            daysOfWeek: corso.giorniSettimana,
          },
          range: {
            type: "endDate",
            startDate: corso.dataInizio.toISOString().split("T")[0],
            endDate: corso.dataFine.toISOString().split("T")[0],
          },
        };
      }

      const outlookEvent = await this.createEvent(event, calendarId);
      created.push(outlookEvent);
    }

    return created;
  }

  /**
   * Sync sport events to Outlook Calendar.
   *
   * Each evento becomes a single or all-day event.
   */
  async syncEventiToCalendar(
    eventi: Array<{
      id: string;
      titolo: string;
      descrizione?: string;
      disciplina?: string;
      dataInizio: Date;
      dataFine: Date;
      tuttoIlGiorno?: boolean;
      luogo?: string;
      partecipanti?: Array<{ email: string; nome?: string }>;
    }>,
    calendarId?: string,
  ): Promise<OutlookEvent[]> {
    const created: OutlookEvent[] = [];

    for (const evento of eventi) {
      const categories = evento.disciplina
        ? [evento.disciplina]
        : [];

      const outlookEvent = await this.createEvent(
        {
          subject: evento.titolo,
          body: evento.descrizione
            ? { contentType: "text", content: evento.descrizione }
            : undefined,
          start: toISOWithTimezone(evento.dataInizio),
          end: toISOWithTimezone(evento.dataFine),
          location: evento.luogo ? { displayName: evento.luogo } : undefined,
          isAllDay: evento.tuttoIlGiorno,
          attendees: evento.partecipanti?.map((p) => ({
            email: p.email,
            name: p.nome,
          })),
          categories,
          showAs: "busy",
          importance: "normal",
        },
        calendarId,
      );

      created.push(outlookEvent);
    }

    return created;
  }

  /**
   * Get the Outlook category color preset for a given sport discipline.
   * Falls back to a default if the discipline is not mapped.
   */
  static getCategoryColor(disciplina: string): string {
    return DISCIPLINE_COLORS[disciplina.toLowerCase()] ?? "preset11"; // default: steel
  }
}
