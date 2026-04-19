import { DRIVE_SCOPES, GoogleDriveService, GoogleOAuthClient } from "@neogesys/integrations/google";
import type { GoogleAuthConfig } from "@neogesys/integrations/google";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../trpc/index";

// ─── Helpers ────────────────────────────────────────────────────────────────

function requireTenant(tenantId: string | undefined): string {
	if (!tenantId) {
		throw new TRPCError({ code: "BAD_REQUEST", message: "Contesto tenant mancante." });
	}
	return tenantId;
}

/**
 * Build a GoogleAuthConfig from vault credentials.
 */
function toAuthConfig(creds: Record<string, string>): GoogleAuthConfig {
	return {
		clientId: creds.clientId ?? "",
		clientSecret: creds.clientSecret ?? "",
		redirectUri: creds.redirectUri ?? "",
		refreshToken: creds.refreshToken ?? "",
		accessToken: creds.accessToken,
	};
}

/**
 * Get an authenticated GoogleDriveService for the current tenant.
 */
async function getDriveService(
	tenantId: string,
	vault: { getCredentials(t: string, p: string): Promise<Record<string, string> | null> },
): Promise<GoogleDriveService> {
	const credentials = await vault.getCredentials(tenantId, "google_drive");
	if (!credentials) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "Google Drive non configurato. Completare prima il flusso OAuth.",
		});
	}
	return new GoogleDriveService(toAuthConfig(credentials));
}

// ─── Router ─────────────────────────────────────────────────────────────────

export const googleDriveRouter = router({
	/**
	 * Start the OAuth flow for Google Drive.
	 * Returns the URL the admin should open in their browser.
	 */
	startOAuth: adminProcedure
		.input(
			z.object({
				clientId: z.string().min(1),
				clientSecret: z.string().min(1),
				redirectUri: z.string().url(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			requireTenant(ctx.tenant?.id);

			const client = new GoogleOAuthClient({
				clientId: input.clientId,
				clientSecret: input.clientSecret,
				redirectUri: input.redirectUri,
				refreshToken: "",
			});

			const authUrl = client.getAuthUrl(DRIVE_SCOPES);
			return { authUrl };
		}),

	/**
	 * Handle the OAuth callback: exchange the code for tokens and save them
	 * in the vault.
	 */
	handleCallback: adminProcedure
		.input(
			z.object({
				code: z.string().min(1),
				clientId: z.string().min(1),
				clientSecret: z.string().min(1),
				redirectUri: z.string().url(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);

			const client = new GoogleOAuthClient({
				clientId: input.clientId,
				clientSecret: input.clientSecret,
				redirectUri: input.redirectUri,
				refreshToken: "",
			});

			const tokens = await client.exchangeCode(input.code);

			// Persist credentials in the vault
			await ctx.vault.setCredentials(tenantId, "google_drive", "storage", {
				clientId: input.clientId,
				clientSecret: input.clientSecret,
				redirectUri: input.redirectUri,
				refreshToken: tokens.refreshToken,
				accessToken: tokens.accessToken,
			});

			return { success: true };
		}),

	/**
	 * List files and folders from Google Drive.
	 */
	listFiles: protectedProcedure
		.input(
			z.object({
				folderId: z.string().optional(),
				query: z.string().optional(),
				pageSize: z.number().int().min(1).max(1000).default(50),
			}),
		)
		.query(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			const drive = await getDriveService(tenantId, ctx.vault);

			return drive.listFiles(input.folderId, input.query, input.pageSize);
		}),

	/**
	 * Upload a document to Google Drive.
	 * Useful for socio documents, certificati, etc.
	 */
	uploadDocument: adminProcedure
		.input(
			z.object({
				name: z.string().min(1).max(300),
				/** Base64-encoded file content. */
				contentBase64: z.string().min(1),
				mimeType: z.string().min(1).max(200),
				folderId: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			const drive = await getDriveService(tenantId, ctx.vault);

			const content = Buffer.from(input.contentBase64, "base64");
			const file = await drive.uploadFile(input.name, content, input.mimeType, input.folderId);

			return file;
		}),

	/**
	 * Create a folder in Google Drive.
	 */
	createFolder: adminProcedure
		.input(
			z.object({
				name: z.string().min(1).max(300),
				parentId: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			const drive = await getDriveService(tenantId, ctx.vault);

			return drive.createFolder(input.name, input.parentId);
		}),

	/**
	 * Delete a file or folder from Google Drive.
	 */
	deleteFile: adminProcedure
		.input(z.object({ fileId: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			const drive = await getDriveService(tenantId, ctx.vault);

			await drive.deleteFile(input.fileId);
			return { success: true };
		}),

	/**
	 * Share a file with a specific email address.
	 */
	shareFile: adminProcedure
		.input(
			z.object({
				fileId: z.string().min(1),
				email: z.string().email(),
				role: z.enum(["reader", "writer", "commenter"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			const drive = await getDriveService(tenantId, ctx.vault);

			await drive.shareFile(input.fileId, input.email, input.role);
			return { success: true };
		}),

	/**
	 * Get Google Drive storage quota.
	 */
	getQuota: protectedProcedure.query(async ({ ctx }) => {
		const tenantId = requireTenant(ctx.tenant?.id);
		const drive = await getDriveService(tenantId, ctx.vault);

		return drive.getStorageQuota();
	}),

	/**
	 * Sync local documents to a Google Drive folder.
	 * Creates the tenant root folder if it doesn't exist and uploads
	 * the provided documents.
	 */
	syncDocuments: adminProcedure
		.input(
			z.object({
				tenantSlug: z.string().min(1),
				documents: z.array(
					z.object({
						name: z.string().min(1),
						contentBase64: z.string().min(1),
						mimeType: z.string().min(1),
						subfolder: z.string().optional(),
					}),
				),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			const drive = await getDriveService(tenantId, ctx.vault);

			// Ensure the root tenant folder exists
			const rootFolder = await drive.ensureTenantFolder(input.tenantSlug);

			// Cache created subfolders to avoid duplicates
			const subfolderCache = new Map<string, string>();

			const results: Array<{ name: string; fileId: string }> = [];

			for (const doc of input.documents) {
				let targetFolderId = rootFolder.id;

				if (doc.subfolder) {
					// Reuse an already-created subfolder, or create it
					const cached = subfolderCache.get(doc.subfolder);
					if (cached) {
						targetFolderId = cached;
					} else {
						const sf = await drive.createFolder(doc.subfolder, rootFolder.id);
						subfolderCache.set(doc.subfolder, sf.id);
						targetFolderId = sf.id;
					}
				}

				const content = Buffer.from(doc.contentBase64, "base64");
				const uploaded = await drive.uploadFile(doc.name, content, doc.mimeType, targetFolderId);

				results.push({ name: uploaded.name, fileId: uploaded.id });
			}

			return {
				rootFolderId: rootFolder.id,
				uploaded: results,
				count: results.length,
			};
		}),
});
