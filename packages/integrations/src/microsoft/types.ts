// ─── Microsoft Auth Config ──────────────────────────────────────────────────

export interface MicrosoftAuthConfig {
  /** Azure AD application (client) ID */
  clientId: string;
  /** Azure AD application client secret */
  clientSecret: string;
  /** Azure AD directory (tenant) ID, or "common" for multi-tenant */
  tenantId: string;
  /** OAuth2 redirect URI registered in Azure AD */
  redirectUri: string;
  /** OAuth2 refresh token (obtained after initial consent) */
  refreshToken: string;
  /** Short-lived access token (may be absent if expired) */
  accessToken?: string;
  /** OAuth2 scopes to request */
  scopes?: string[];
}

// ─── OneDrive Types ─────────────────────────────────────────────────────────

export interface OneDriveFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  webUrl: string;
  downloadUrl?: string;
  parentReference: {
    id?: string;
    driveId?: string;
    path?: string;
  };
  file?: { mimeType: string; hashes?: Record<string, string> };
  folder?: { childCount: number };
}

export interface OneDriveFileList {
  files: OneDriveFile[];
  nextLink?: string;
}

export interface ShareLink {
  id: string;
  link: {
    webUrl: string;
    type: string;
  };
}

export interface OneDriveProvider {
  /** Generate the Microsoft OAuth2 authorization URL. */
  authenticate(): Promise<string>;

  /** Exchange an authorization code for tokens and return updated config. */
  handleCallback(code: string): Promise<MicrosoftAuthConfig>;

  /** Refresh the access token using the stored refresh token. */
  refreshAccessToken(): Promise<string>;

  /** List files in a folder (defaults to root). */
  listFiles(folderId?: string, query?: string, top?: number): Promise<OneDriveFileList>;

  /** Get a single file/folder item by ID. */
  getFile(fileId: string): Promise<OneDriveFile>;

  /** Upload a small file (< 4 MB). */
  uploadFile(name: string, content: Buffer, parentId?: string): Promise<OneDriveFile>;

  /** Upload a large file using an upload session (>= 4 MB). */
  uploadLargeFile(
    name: string,
    size: number,
    stream: ReadableStream,
    parentId?: string,
  ): Promise<OneDriveFile>;

  /** Create a folder. */
  createFolder(name: string, parentId?: string): Promise<OneDriveFile>;

  /** Delete a file or folder by ID. */
  deleteFile(fileId: string): Promise<void>;

  /** Share a file with another user via email. */
  shareFile(fileId: string, email: string, role: "read" | "write"): Promise<ShareLink>;

  /** Get OneDrive storage quota for the authenticated user. */
  getStorageQuota(): Promise<{ used: number; remaining: number; total: number }>;

  /** Download a file's contents as a Buffer. */
  downloadFile(fileId: string): Promise<Buffer>;

  /** Search files by query string. */
  searchFiles(query: string): Promise<OneDriveFileList>;
}

// ─── Outlook Calendar Types ─────────────────────────────────────────────────

export interface OutlookEvent {
  id: string;
  subject: string;
  body: { contentType: string; content: string };
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location: { displayName: string };
  attendees: Array<{
    emailAddress: { address: string; name?: string };
    type: string;
    status?: { response: string; time?: string };
  }>;
  isAllDay: boolean;
  recurrence: OutlookRecurrence | null;
  webLink: string;
  categories: string[];
}

export interface OutlookRecurrence {
  pattern: {
    type: "daily" | "weekly" | "absoluteMonthly" | "relativeMonthly";
    interval: number;
    daysOfWeek?: string[];
    dayOfMonth?: number;
  };
  range: {
    type: "endDate" | "noEnd" | "numbered";
    startDate: string;
    endDate?: string;
    numberOfOccurrences?: number;
  };
}

export interface CreateOutlookEvent {
  subject: string;
  body?: { contentType: string; content: string };
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: { displayName: string };
  attendees?: Array<{ email: string; name?: string; type?: string }>;
  isAllDay?: boolean;
  recurrence?: OutlookRecurrence;
  categories?: string[];
  showAs?: "free" | "tentative" | "busy" | "oof" | "workingElsewhere" | "unknown";
  importance?: "low" | "normal" | "high";
}

export interface OutlookCalendar {
  id: string;
  name: string;
  color: string;
  isDefaultCalendar: boolean;
  canEdit: boolean;
}

export interface OutlookCalendarList {
  calendars: OutlookCalendar[];
}

export interface OutlookEventList {
  events: OutlookEvent[];
  nextLink?: string;
}

export interface Subscription {
  id: string;
  resource: string;
  changeType: string;
  expirationDateTime: string;
}

export interface OutlookCalendarProvider {
  /** List all calendars for the authenticated user. */
  listCalendars(): Promise<OutlookCalendarList>;

  /** Get a single calendar by ID. */
  getCalendar(calendarId: string): Promise<OutlookCalendar>;

  /** List events, optionally filtered by calendar, date range, or OData filter. */
  listEvents(
    calendarId?: string,
    startDateTime?: Date,
    endDateTime?: Date,
    filter?: string,
  ): Promise<OutlookEventList>;

  /** Get a single event by ID. */
  getEvent(eventId: string): Promise<OutlookEvent>;

  /** Create an event (optionally in a specific calendar). */
  createEvent(event: CreateOutlookEvent, calendarId?: string): Promise<OutlookEvent>;

  /** Update (patch) an existing event. */
  updateEvent(eventId: string, event: Partial<CreateOutlookEvent>): Promise<OutlookEvent>;

  /** Delete an event by ID. */
  deleteEvent(eventId: string): Promise<void>;

  /** Subscribe to change notifications on a resource via Microsoft Graph webhooks. */
  subscribeToChanges(webhookUrl: string, resource: string): Promise<Subscription>;

  /** Delete a webhook subscription. */
  deleteSubscription(subscriptionId: string): Promise<void>;
}
