import { betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins";

/**
 * Session configuration constants.
 */
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds
const isProduction = process.env.NODE_ENV === "production";

/**
 * Additional user fields for the Italian sports platform.
 */
export interface UserAdditionalFields {
	nome: string;
	cognome: string;
	telefono?: string;
}

/**
 * Better Auth configuration for multi-tenant sports platform.
 *
 * Features:
 * - Session-based authentication
 * - Multi-tenant aware (tenant context stored in session)
 * - Password hashing with argon2id (better-auth built-in)
 * - 2FA TOTP support
 * - Email verification
 */
// biome-ignore lint/suspicious/noExplicitAny: better-auth return type is too complex to portably infer
export function createAuthConfig(options: {
	databaseUrl: string;
	baseUrl: string;
	secret: string;
	trustedOrigins?: string[];
}): any {
	return betterAuth({
		database: {
			type: "postgres",
			url: options.databaseUrl,
		},

		baseURL: options.baseUrl,
		secret: options.secret,
		trustedOrigins: options.trustedOrigins ?? [],

		emailAndPassword: {
			enabled: true,
			requireEmailVerification: true,
			autoSignIn: false,
		},

		session: {
			expiresIn: SESSION_MAX_AGE,
			updateAge: SESSION_MAX_AGE / 10, // refresh session if older than 3 days
			cookieCache: {
				enabled: true,
				maxAge: 5 * 60, // 5 minute cookie cache
			},
		},

		advanced: {
			cookiePrefix: "neogesys",
			generateId: undefined, // use default (cuid2)
			cookies: {
				session_token: {
					name: "neogesys.session_token",
					attributes: {
						httpOnly: true,
						secure: isProduction,
						sameSite: "lax" as const,
						path: "/",
					},
				},
			},
		},

		user: {
			additionalFields: {
				nome: {
					type: "string",
					required: true,
					input: true,
				},
				cognome: {
					type: "string",
					required: true,
					input: true,
				},
				telefono: {
					type: "string",
					required: false,
					input: true,
				},
			},
		},

		plugins: [
			twoFactor({
				issuer: "NeoGesys Sport",
				totpOptions: {
					digits: 6,
					period: 30,
				},
			}),
		],
	});
}

// biome-ignore lint/suspicious/noExplicitAny: mirrors createAuthConfig return
export type Auth = any;
