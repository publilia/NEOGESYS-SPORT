import type { MicrosoftAuthConfig } from "./types";

// ─── Scope Constants ────────────────────────────────────────────────────────

/** Scopes required for OneDrive operations. */
export const ONEDRIVE_SCOPES = ["Files.ReadWrite.All", "offline_access", "User.Read"] as const;

/** Scopes required for Outlook Calendar operations. */
export const CALENDAR_SCOPES = ["Calendars.ReadWrite", "offline_access", "User.Read"] as const;

/** Scopes required for mail (send/read) operations. */
export const MAIL_SCOPES = ["Mail.Send", "Mail.ReadWrite", "offline_access", "User.Read"] as const;

// ─── Error Handling ─────────────────────────────────────────────────────────

export class MicrosoftAuthError extends Error {
	constructor(
		message: string,
		public readonly errorCode?: string,
		public readonly statusCode?: number,
	) {
		super(message);
		this.name = "MicrosoftAuthError";
	}
}

// ─── OAuth Client ───────────────────────────────────────────────────────────

/**
 * Lightweight Microsoft OAuth2 client that uses the Microsoft Identity Platform v2.0
 * endpoints directly via fetch -- no @azure/msal dependency.
 *
 * Supports both single-tenant (specific Azure AD tenant) and multi-tenant ("common")
 * Azure AD applications.
 */
export class MicrosoftOAuthClient {
	private config: MicrosoftAuthConfig;
	private tokenExpiresAt = 0;

	constructor(config: MicrosoftAuthConfig) {
		this.config = { ...config };
	}

	// ── Public API ──────────────────────────────────────────────────────────

	/**
	 * Generate the Microsoft OAuth2 authorization URL.
	 * The user should be redirected to this URL to initiate consent.
	 */
	getAuthUrl(scopes: string[], state?: string): string {
		const params = new URLSearchParams({
			client_id: this.config.clientId,
			response_type: "code",
			redirect_uri: this.config.redirectUri,
			response_mode: "query",
			scope: scopes.join(" "),
			prompt: "consent",
		});

		if (state) {
			params.set("state", state);
		}

		return `${this.authorizeEndpoint}?${params.toString()}`;
	}

	/**
	 * Exchange an authorization code for an access + refresh token pair.
	 * Returns the updated MicrosoftAuthConfig with tokens populated.
	 */
	async exchangeCode(code: string, scopes?: string[]): Promise<MicrosoftAuthConfig> {
		const body = new URLSearchParams({
			client_id: this.config.clientId,
			client_secret: this.config.clientSecret,
			code,
			redirect_uri: this.config.redirectUri,
			grant_type: "authorization_code",
		});

		if (scopes?.length) {
			body.set("scope", scopes.join(" "));
		}

		const response = await fetch(this.tokenEndpoint, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: body.toString(),
		});

		const data = (await response.json()) as {
			access_token?: string;
			refresh_token?: string;
			expires_in?: number;
			error?: string;
			error_description?: string;
		};

		if (!response.ok) {
			throw new MicrosoftAuthError(
				data.error_description ?? data.error ?? "Token exchange failed",
				data.error,
				response.status,
			);
		}

		this.config.accessToken = data.access_token;
		this.config.refreshToken = data.refresh_token ?? this.config.refreshToken;
		this.tokenExpiresAt = Date.now() + (data.expires_in as number) * 1000 - 60_000;

		return { ...this.config };
	}

	/**
	 * Refresh the access token using the stored refresh token.
	 * Returns the new access token.
	 */
	async refreshToken(): Promise<string> {
		if (!this.config.refreshToken) {
			throw new MicrosoftAuthError("No refresh token available. Re-authorization required.");
		}

		const body = new URLSearchParams({
			client_id: this.config.clientId,
			client_secret: this.config.clientSecret,
			refresh_token: this.config.refreshToken,
			grant_type: "refresh_token",
		});

		const response = await fetch(this.tokenEndpoint, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: body.toString(),
		});

		const data = (await response.json()) as {
			access_token?: string;
			refresh_token?: string;
			expires_in?: number;
			error?: string;
			error_description?: string;
		};

		if (!response.ok) {
			throw new MicrosoftAuthError(
				data.error_description ?? data.error ?? "Token refresh failed",
				data.error,
				response.status,
			);
		}

		this.config.accessToken = data.access_token;
		if (data.refresh_token) {
			this.config.refreshToken = data.refresh_token;
		}
		this.tokenExpiresAt = Date.now() + (data.expires_in as number) * 1000 - 60_000;

		return data.access_token as string;
	}

	/**
	 * Returns a valid access token, auto-refreshing if necessary.
	 */
	async getAccessToken(): Promise<string> {
		if (this.config.accessToken && Date.now() < this.tokenExpiresAt) {
			return this.config.accessToken;
		}

		return this.refreshToken();
	}

	/**
	 * Return the current config (including any updated tokens).
	 * Useful for persisting new refresh tokens back to the vault.
	 */
	getConfig(): MicrosoftAuthConfig {
		return { ...this.config };
	}

	// ── Endpoints ───────────────────────────────────────────────────────────

	private get authorizeEndpoint(): string {
		const tenant = this.config.tenantId || "common";
		return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`;
	}

	private get tokenEndpoint(): string {
		const tenant = this.config.tenantId || "common";
		return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
	}
}
