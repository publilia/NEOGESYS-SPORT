// ─── Google Auth ─────────────────────────────────────────────────────────────

export interface GoogleAuthConfig {
	clientId: string;
	clientSecret: string;
	redirectUri: string;
	refreshToken: string;
	accessToken?: string;
}

// ─── Google Drive Types ─────────────────────────────────────────────────────

export interface DriveFile {
	id: string;
	name: string;
	mimeType: string;
	size: number;
	createdTime: string;
	modifiedTime: string;
	webViewLink: string;
	webContentLink: string;
	parents: string[];
	thumbnailLink: string;
}

export interface DriveFileList {
	files: DriveFile[];
	nextPageToken?: string;
}

export interface GoogleDriveProvider {
	/** Generate the OAuth2 consent URL for the user to authorize Drive access. */
	authenticate(): Promise<string>;

	/** Exchange an authorization code for tokens. */
	handleCallback(code: string): Promise<GoogleAuthConfig>;

	/** Refresh the access token using the stored refresh token. */
	refreshAccessToken(): Promise<string>;

	/** List files and folders, optionally filtered by folder, query, and page size. */
	listFiles(folderId?: string, query?: string, pageSize?: number): Promise<DriveFileList>;

	/** Get metadata for a single file. */
	getFile(fileId: string): Promise<DriveFile>;

	/** Upload a file to Google Drive. */
	uploadFile(
		name: string,
		content: Buffer | ReadableStream,
		mimeType: string,
		folderId?: string,
	): Promise<DriveFile>;

	/** Create a folder in Google Drive. */
	createFolder(name: string, parentId?: string): Promise<DriveFile>;

	/** Delete a file or folder. */
	deleteFile(fileId: string): Promise<void>;

	/** Share a file with a specific email and role. */
	shareFile(fileId: string, email: string, role: "reader" | "writer" | "commenter"): Promise<void>;

	/** Get the storage quota for the authenticated account. */
	getStorageQuota(): Promise<{ used: number; total: number }>;

	/** Export a Google Workspace file to the specified MIME type. */
	exportFile(fileId: string, mimeType: string): Promise<Buffer>;
}

// ─── Google Calendar Types ──────────────────────────────────────────────────

export interface CalendarDateTime {
	dateTime: string;
	timeZone: string;
}

export interface CalendarAttendee {
	email: string;
	displayName?: string;
	responseStatus?: "needsAction" | "declined" | "tentative" | "accepted";
}

export interface CalendarReminder {
	method: "email" | "popup";
	minutes: number;
}

export interface CalendarEvent {
	id: string;
	summary: string;
	description: string;
	location: string;
	start: CalendarDateTime;
	end: CalendarDateTime;
	attendees: CalendarAttendee[];
	status: "confirmed" | "tentative" | "cancelled";
	htmlLink: string;
	recurringEventId: string;
	recurrence: string[];
}

export interface CreateCalendarEvent {
	summary: string;
	description?: string;
	location?: string;
	start: CalendarDateTime;
	end: CalendarDateTime;
	attendees?: CalendarAttendee[];
	recurrence?: string[];
	reminders?: {
		useDefault: boolean;
		overrides?: CalendarReminder[];
	};
	colorId?: string;
}

export interface Calendar {
	id: string;
	summary: string;
	description: string;
	timeZone: string;
	backgroundColor: string;
	foregroundColor: string;
	primary: boolean;
	accessRole: string;
}

export interface CalendarList {
	calendars: Calendar[];
	nextPageToken?: string;
}

export interface CalendarEventList {
	events: CalendarEvent[];
	nextPageToken?: string;
}

export interface WatchResponse {
	channelId: string;
	resourceId: string;
	expiration: number;
}

export interface GoogleCalendarProvider {
	/** List all calendars visible to the authenticated user. */
	listCalendars(): Promise<CalendarList>;

	/** Get details of a specific calendar. */
	getCalendar(calendarId: string): Promise<Calendar>;

	/** List events from a calendar with optional time range and search query. */
	listEvents(
		calendarId: string,
		timeMin?: Date,
		timeMax?: Date,
		query?: string,
	): Promise<CalendarEventList>;

	/** Get a single event by ID. */
	getEvent(calendarId: string, eventId: string): Promise<CalendarEvent>;

	/** Create a new calendar event. */
	createEvent(calendarId: string, event: CreateCalendarEvent): Promise<CalendarEvent>;

	/** Update an existing calendar event. */
	updateEvent(
		calendarId: string,
		eventId: string,
		event: Partial<CreateCalendarEvent>,
	): Promise<CalendarEvent>;

	/** Delete a calendar event. */
	deleteEvent(calendarId: string, eventId: string): Promise<void>;

	/** Register a webhook to receive push notifications for calendar changes. */
	watchEvents(calendarId: string, webhookUrl: string): Promise<WatchResponse>;

	/** Stop receiving push notifications for a previously registered watch. */
	stopWatch(channelId: string, resourceId: string): Promise<void>;
}
