import type { GoogleAuthConfig } from "./types";

// ─── Google OAuth2 Endpoints ────────────────────────────────────────────────

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

// ─── Scope Constants ────────────────────────────────────────────────────────

/** Full read/write access to Google Drive. */
export const DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/drive.file",
];

/** Read-only access to Google Drive. */
export const DRIVE_READONLY_SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
];

/** Full read/write access to Google Calendar. */
export const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

// ─── Error Types ────────────────────────────────────────────────────────────

export class GoogleAuthError extends Error {
  public readonly statusCode: number;
  public readonly googleErrorCode: string | undefined;

  constructor(
    message: string,
    statusCode: number,
    googleErrorCode?: string,
  ) {
    super(message);
    this.name = "GoogleAuthError";
    this.statusCode = statusCode;
    this.googleErrorCode = googleErrorCode;
  }
}

// ─── Token Cache ────────────────────────────────────────────────────────────

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

// ─── GoogleOAuthClient ──────────────────────────────────────────────────────

/**
 * Lightweight Google OAuth2 client using the fetch API.
 *
 * Handles authorization URL generation, code exchange, and automatic
 * token refresh without depending on the heavy `googleapis` SDK.
 */
export class GoogleOAuthClient {
  private readonly config: GoogleAuthConfig;
  private cachedToken: CachedToken | null = null;

  constructor(config: GoogleAuthConfig) {
    this.config = config;

    // Seed cache if an access token was provided
    if (config.accessToken) {
      this.cachedToken = {
        accessToken: config.accessToken,
        // Assume it's valid for a short time; refreshToken() will replace it
        expiresAt: Date.now() + 5 * 60 * 1000,
      };
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Generate the OAuth2 consent URL that the tenant admin opens in their
   * browser.  Requests offline access so we receive a refresh token.
   */
  getAuthUrl(scopes: string[]): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: "code",
      scope: scopes.join(" "),
      access_type: "offline",
      prompt: "consent",
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange the authorization code obtained from the OAuth callback for
   * access and refresh tokens.
   *
   * @returns The refresh token that should be persisted in the vault.
   */
  async exchangeCode(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const body = new URLSearchParams({
      code,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.config.redirectUri,
      grant_type: "authorization_code",
    });

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      const err = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      throw new GoogleAuthError(
        `Errore scambio codice OAuth: ${err.error_description ?? err.error ?? response.statusText}`,
        response.status,
        err.error as string | undefined,
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    // Cache the new token
    this.cachedToken = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  }

  /**
   * Refresh the access token using the stored refresh token.
   *
   * @returns A fresh access token.
   */
  async refreshToken(): Promise<string> {
    if (!this.config.refreshToken) {
      throw new GoogleAuthError(
        "Refresh token mancante. Completare prima il flusso OAuth.",
        401,
      );
    }

    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: this.config.refreshToken,
      grant_type: "refresh_token",
    });

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      const err = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      throw new GoogleAuthError(
        `Errore refresh token: ${err.error_description ?? err.error ?? response.statusText}`,
        response.status,
        err.error as string | undefined,
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
    };

    this.cachedToken = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    return data.access_token;
  }

  /**
   * Return a valid access token, refreshing it automatically if it has
   * expired (or is about to expire within 60 seconds).
   */
  async getAccessToken(): Promise<string> {
    const bufferMs = 60 * 1000; // refresh 60 s before expiry

    if (this.cachedToken && this.cachedToken.expiresAt > Date.now() + bufferMs) {
      return this.cachedToken.accessToken;
    }

    return this.refreshToken();
  }
}
