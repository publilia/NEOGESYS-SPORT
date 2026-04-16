import type {
  GoogleCalendarProvider,
  GoogleAuthConfig,
  Calendar,
  CalendarList,
  CalendarEvent,
  CalendarEventList,
  CreateCalendarEvent,
  WatchResponse,
  CalendarDateTime,
} from "./types";
import { GoogleOAuthClient, CALENDAR_SCOPES, GoogleAuthError } from "./auth";

// ─── Constants ──────────────────────────────────────────────────────────────

const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";
const DEFAULT_TIMEZONE = "Europe/Rome";

/**
 * Color mapping for common sport disciplines.
 * Values correspond to Google Calendar colorId (1-11).
 *
 * @see https://developers.google.com/calendar/api/v3/reference/colors/get
 */
export const SPORT_COLOR_MAP: Record<string, string> = {
  calcio: "9",       // Blueberry
  pallavolo: "5",    // Banana
  nuoto: "7",        // Peacock
  atletica: "11",    // Tomato
  basket: "6",       // Tangerine
  tennis: "2",       // Sage
  ginnastica: "3",   // Grape
  danza: "4",        // Flamingo
  arti_marziali: "10", // Basil
  ciclismo: "1",     // Lavender
  yoga: "8",         // Graphite
};

// ─── Error Types ────────────────────────────────────────────────────────────

export class GoogleCalendarError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "GoogleCalendarError";
    this.statusCode = statusCode;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function toCalendar(raw: Record<string, unknown>): Calendar {
  return {
    id: (raw.id as string) ?? "",
    summary: (raw.summary as string) ?? "",
    description: (raw.description as string) ?? "",
    timeZone: (raw.timeZone as string) ?? DEFAULT_TIMEZONE,
    backgroundColor: (raw.backgroundColor as string) ?? "",
    foregroundColor: (raw.foregroundColor as string) ?? "",
    primary: (raw.primary as boolean) ?? false,
    accessRole: (raw.accessRole as string) ?? "",
  };
}

function toCalendarEvent(raw: Record<string, unknown>): CalendarEvent {
  const start = raw.start as Record<string, string> | undefined;
  const end = raw.end as Record<string, string> | undefined;
  const attendees = raw.attendees as Array<Record<string, unknown>> | undefined;

  return {
    id: (raw.id as string) ?? "",
    summary: (raw.summary as string) ?? "",
    description: (raw.description as string) ?? "",
    location: (raw.location as string) ?? "",
    start: {
      dateTime: start?.dateTime ?? "",
      timeZone: start?.timeZone ?? DEFAULT_TIMEZONE,
    },
    end: {
      dateTime: end?.dateTime ?? "",
      timeZone: end?.timeZone ?? DEFAULT_TIMEZONE,
    },
    attendees: (attendees ?? []).map((a) => ({
      email: (a.email as string) ?? "",
      displayName: a.displayName as string | undefined,
      responseStatus: a.responseStatus as CalendarEvent["attendees"][number]["responseStatus"],
    })),
    status: (raw.status as CalendarEvent["status"]) ?? "confirmed",
    htmlLink: (raw.htmlLink as string) ?? "",
    recurringEventId: (raw.recurringEventId as string) ?? "",
    recurrence: (raw.recurrence as string[]) ?? [],
  };
}

// ─── GoogleCalendarService ──────────────────────────────────────────────────

/**
 * Google Calendar integration that talks directly to the Calendar REST API v3
 * via the fetch API.
 *
 * Each instance is scoped to a single tenant's Google credentials.
 */
export class GoogleCalendarService implements GoogleCalendarProvider {
  private readonly auth: GoogleOAuthClient;
  private readonly config: GoogleAuthConfig;

  constructor(config: GoogleAuthConfig) {
    this.config = config;
    this.auth = new GoogleOAuthClient(config);
  }

  // ── Internal Helpers ────────────────────────────────────────────────────

  private async headers(): Promise<Record<string, string>> {
    const token = await this.auth.getAccessToken();
    return { Authorization: `Bearer ${token}` };
  }

  private async request<T = unknown>(
    url: string,
    init?: RequestInit,
  ): Promise<T> {
    const hdrs = await this.headers();
    const response = await fetch(url, {
      ...init,
      headers: { ...hdrs, ...(init?.headers as Record<string, string>) },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new GoogleCalendarError(
        `Google Calendar API error (${response.status}): ${body}`,
        response.status,
      );
    }

    if (response.status === 204) {
      return undefined as unknown as T;
    }

    return response.json() as Promise<T>;
  }

  // ── Auth (used during initial OAuth setup) ─────────────────────────────

  /** Generate the OAuth2 consent URL for Calendar scopes. */
  getAuthUrl(): string {
    return this.auth.getAuthUrl(CALENDAR_SCOPES);
  }

  /** Exchange an auth code and return updated config with tokens. */
  async handleCallback(code: string): Promise<GoogleAuthConfig> {
    const tokens = await this.auth.exchangeCode(code);
    return {
      ...this.config,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  // ── GoogleCalendarProvider Implementation ─────────────────────────────

  async listCalendars(): Promise<CalendarList> {
    const params = new URLSearchParams({
      minAccessRole: "writer",
      showHidden: "false",
    });

    const data = await this.request<{
      items: Array<Record<string, unknown>>;
      nextPageToken?: string;
    }>(`${CALENDAR_API_BASE}/users/me/calendarList?${params.toString()}`);

    return {
      calendars: (data.items ?? []).map(toCalendar),
      nextPageToken: data.nextPageToken,
    };
  }

  async getCalendar(calendarId: string): Promise<Calendar> {
    const raw = await this.request<Record<string, unknown>>(
      `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}`,
    );
    return toCalendar(raw);
  }

  async listEvents(
    calendarId: string,
    timeMin?: Date,
    timeMax?: Date,
    query?: string,
  ): Promise<CalendarEventList> {
    const params = new URLSearchParams({
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
      timeZone: DEFAULT_TIMEZONE,
    });

    if (timeMin) params.set("timeMin", timeMin.toISOString());
    if (timeMax) params.set("timeMax", timeMax.toISOString());
    if (query) params.set("q", query);

    const data = await this.request<{
      items: Array<Record<string, unknown>>;
      nextPageToken?: string;
    }>(
      `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
    );

    return {
      events: (data.items ?? []).map(toCalendarEvent),
      nextPageToken: data.nextPageToken,
    };
  }

  async getEvent(
    calendarId: string,
    eventId: string,
  ): Promise<CalendarEvent> {
    const raw = await this.request<Record<string, unknown>>(
      `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    );
    return toCalendarEvent(raw);
  }

  async createEvent(
    calendarId: string,
    event: CreateCalendarEvent,
  ): Promise<CalendarEvent> {
    const raw = await this.request<Record<string, unknown>>(
      `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      },
    );
    return toCalendarEvent(raw);
  }

  async updateEvent(
    calendarId: string,
    eventId: string,
    event: Partial<CreateCalendarEvent>,
  ): Promise<CalendarEvent> {
    const raw = await this.request<Record<string, unknown>>(
      `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      },
    );
    return toCalendarEvent(raw);
  }

  async deleteEvent(
    calendarId: string,
    eventId: string,
  ): Promise<void> {
    await this.request<void>(
      `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      { method: "DELETE" },
    );
  }

  async watchEvents(
    calendarId: string,
    webhookUrl: string,
  ): Promise<WatchResponse> {
    const channelId = crypto.randomUUID();

    const data = await this.request<{
      id: string;
      resourceId: string;
      expiration: string;
    }>(
      `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/watch`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: channelId,
          type: "web_hook",
          address: webhookUrl,
        }),
      },
    );

    return {
      channelId: data.id,
      resourceId: data.resourceId,
      expiration: Number(data.expiration),
    };
  }

  async stopWatch(
    channelId: string,
    resourceId: string,
  ): Promise<void> {
    await this.request<void>(
      `${CALENDAR_API_BASE}/channels/stop`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: channelId, resourceId }),
      },
    );
  }

  // ── Sync Helpers ──────────────────────────────────────────────────────

  /**
   * Synchronize an array of corsi (course schedules) to a Google Calendar.
   *
   * Each corso becomes a recurring event (or one-off event) in the target
   * calendar.  Returns the created/updated event IDs.
   */
  async syncCorsiToCalendar(
    corsi: Array<{
      id: string;
      nome: string;
      descrizione?: string;
      luogo?: string;
      dataInizio: string;
      dataFine?: string;
      orario?: string;
      disciplina?: string;
      ricorrenza?: string[];
    }>,
    calendarId: string,
  ): Promise<string[]> {
    const eventIds: string[] = [];

    for (const corso of corsi) {
      const colorId = corso.disciplina
        ? SPORT_COLOR_MAP[corso.disciplina] ?? undefined
        : undefined;

      const event: CreateCalendarEvent = {
        summary: corso.nome,
        description: corso.descrizione,
        location: corso.luogo,
        start: {
          dateTime: corso.dataInizio,
          timeZone: DEFAULT_TIMEZONE,
        },
        end: {
          dateTime: corso.dataFine ?? corso.dataInizio,
          timeZone: DEFAULT_TIMEZONE,
        },
        recurrence: corso.ricorrenza,
        colorId,
      };

      const created = await this.createEvent(calendarId, event);
      eventIds.push(created.id);
    }

    return eventIds;
  }

  /**
   * Synchronize an array of eventi (sport events) to a Google Calendar.
   *
   * Each evento becomes a single event.  Returns the created event IDs.
   */
  async syncEventiToCalendar(
    eventi: Array<{
      id: string;
      titolo: string;
      descrizione?: string;
      luogo?: string;
      dataInizio: string;
      dataFine?: string;
      tipo?: string;
    }>,
    calendarId: string,
  ): Promise<string[]> {
    const eventIds: string[] = [];

    for (const evento of eventi) {
      const colorId = evento.tipo
        ? SPORT_COLOR_MAP[evento.tipo] ?? undefined
        : undefined;

      const event: CreateCalendarEvent = {
        summary: evento.titolo,
        description: evento.descrizione,
        location: evento.luogo,
        start: {
          dateTime: evento.dataInizio,
          timeZone: DEFAULT_TIMEZONE,
        },
        end: {
          dateTime: evento.dataFine ?? evento.dataInizio,
          timeZone: DEFAULT_TIMEZONE,
        },
        colorId,
      };

      const created = await this.createEvent(calendarId, event);
      eventIds.push(created.id);
    }

    return eventIds;
  }
}
