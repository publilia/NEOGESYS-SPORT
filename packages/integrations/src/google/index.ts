// Types
export type {
  GoogleAuthConfig,
  GoogleDriveProvider,
  DriveFile,
  DriveFileList,
  GoogleCalendarProvider,
  CalendarEvent,
  CreateCalendarEvent,
  CalendarList,
  Calendar,
  CalendarEventList,
  CalendarDateTime,
  CalendarAttendee,
  CalendarReminder,
  WatchResponse,
} from "./types";

// Auth
export {
  GoogleOAuthClient,
  GoogleAuthError,
  DRIVE_SCOPES,
  DRIVE_READONLY_SCOPES,
  CALENDAR_SCOPES,
} from "./auth";

// Drive
export { GoogleDriveService, GoogleDriveError } from "./drive";

// Calendar
export {
  GoogleCalendarService,
  GoogleCalendarError,
  SPORT_COLOR_MAP,
} from "./calendar";

// Factory
export {
  getGoogleDriveProvider,
  getGoogleCalendarProvider,
} from "./factory";
