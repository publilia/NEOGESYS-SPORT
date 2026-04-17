// ─── Unified Calendar Types ────────────────────────────────────────────────
//
// Provider-agnostic calendar types that abstract Google Calendar and
// Outlook Calendar (Microsoft Graph) behind a single interface.
// ────────────────────────────────────────────────────────────────────────────

/** The backend calendar provider in use for a given tenant. */
export type CalendarProviderType = "google" | "microsoft";

// ─── Unified Data Types ────────────────────────────────────────────────────

export interface UnifiedCalendar {
  id: string;
  name: string;
  description?: string;
  timeZone: string;
  color?: string;
  isPrimary: boolean;
  provider: CalendarProviderType;
}

export interface UnifiedCalendarEvent {
  id: string;
  calendarId: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  isAllDay: boolean;
  isRecurring: boolean;
  status: "confirmed" | "tentative" | "cancelled";
  htmlLink?: string;
  provider: CalendarProviderType;
  /** The original provider-specific event ID for direct API calls. */
  providerEventId: string;
}

export interface CreateUnifiedEvent {
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  isAllDay?: boolean;
  recurrence?: string[];
  /** Provider-specific color or category identifier. */
  colorId?: string;
}

export interface UnifiedCalendarEventList {
  events: UnifiedCalendarEvent[];
  nextPageToken?: string;
}

export interface UnifiedCalendarList {
  calendars: UnifiedCalendar[];
}

export interface SyncInfo {
  channelId?: string;
  resourceId?: string;
  subscriptionId?: string;
  expiration: Date;
}

// ─── Unified Provider Interface ────────────────────────────────────────────

export interface CalendarProvider {
  /** The type of calendar provider. */
  readonly providerType: CalendarProviderType;

  /** List all calendars accessible by the authenticated account. */
  listCalendars(): Promise<UnifiedCalendarList>;

  /**
   * List events from a specific calendar, optionally filtered by time range
   * and search query.
   */
  listEvents(
    calendarId: string,
    timeMin?: Date,
    timeMax?: Date,
    query?: string,
  ): Promise<UnifiedCalendarEventList>;

  /** Create a new event in the specified calendar. */
  createEvent(
    calendarId: string,
    event: CreateUnifiedEvent,
  ): Promise<UnifiedCalendarEvent>;

  /** Update an existing event. */
  updateEvent(
    calendarId: string,
    eventId: string,
    event: Partial<CreateUnifiedEvent>,
  ): Promise<UnifiedCalendarEvent>;

  /** Delete an event. */
  deleteEvent(calendarId: string, eventId: string): Promise<void>;

  /**
   * Setup push sync (webhook / subscription) for a calendar so that
   * changes are pushed to the provided webhook URL.
   */
  setupSync(calendarId: string, webhookUrl: string): Promise<SyncInfo>;

  /** Stop an active sync subscription. */
  stopSync(syncInfo: SyncInfo): Promise<void>;
}
