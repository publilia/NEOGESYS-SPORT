// Types
export type {
  MicrosoftAuthConfig,
  OneDriveProvider,
  OneDriveFile,
  OneDriveFileList,
  ShareLink,
  OutlookCalendarProvider,
  OutlookCalendar,
  OutlookCalendarList,
  OutlookEvent,
  OutlookEventList,
  CreateOutlookEvent,
  OutlookRecurrence,
  Subscription,
} from "./types";

// Auth
export {
  MicrosoftOAuthClient,
  MicrosoftAuthError,
  ONEDRIVE_SCOPES,
  CALENDAR_SCOPES,
  MAIL_SCOPES,
} from "./auth";

// OneDrive
export { OneDriveService } from "./onedrive";

// Calendar
export { OutlookCalendarService } from "./calendar";

// Factory
export {
  getOneDriveProvider,
  getOutlookCalendarProvider,
} from "./factory";
