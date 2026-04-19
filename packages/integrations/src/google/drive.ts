import { DRIVE_SCOPES, GoogleOAuthClient } from "./auth";
import type { DriveFile, DriveFileList, GoogleAuthConfig, GoogleDriveProvider } from "./types";

// ─── Constants ──────────────────────────────────────────────────────────────

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";
const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

/** Fields returned when querying a single file. */
const FILE_FIELDS =
	"id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink,parents,thumbnailLink";

// ─── Error Types ────────────────────────────────────────────────────────────

export class GoogleDriveError extends Error {
	public readonly statusCode: number;

	constructor(message: string, statusCode: number) {
		super(message);
		this.name = "GoogleDriveError";
		this.statusCode = statusCode;
	}
}

// ─── Helper ─────────────────────────────────────────────────────────────────

function toDriveFile(raw: Record<string, unknown>): DriveFile {
	return {
		id: (raw.id as string) ?? "",
		name: (raw.name as string) ?? "",
		mimeType: (raw.mimeType as string) ?? "",
		size: Number(raw.size ?? 0),
		createdTime: (raw.createdTime as string) ?? "",
		modifiedTime: (raw.modifiedTime as string) ?? "",
		webViewLink: (raw.webViewLink as string) ?? "",
		webContentLink: (raw.webContentLink as string) ?? "",
		parents: (raw.parents as string[]) ?? [],
		thumbnailLink: (raw.thumbnailLink as string) ?? "",
	};
}

// ─── GoogleDriveService ─────────────────────────────────────────────────────

/**
 * Google Drive integration that talks directly to the Drive REST API v3
 * via the fetch API.
 *
 * Each instance is scoped to a single tenant's Google credentials.
 */
export class GoogleDriveService implements GoogleDriveProvider {
	private readonly auth: GoogleOAuthClient;
	private readonly config: GoogleAuthConfig;

	constructor(config: GoogleAuthConfig) {
		this.config = config;
		this.auth = new GoogleOAuthClient(config);
	}

	// ── Auth Helpers ────────────────────────────────────────────────────────

	private async headers(): Promise<Record<string, string>> {
		const token = await this.auth.getAccessToken();
		return { Authorization: `Bearer ${token}` };
	}

	private async request<T = unknown>(url: string, init?: RequestInit): Promise<T> {
		const hdrs = await this.headers();
		const response = await fetch(url, {
			...init,
			headers: { ...hdrs, ...(init?.headers as Record<string, string>) },
		});

		if (!response.ok) {
			const body = await response.text().catch(() => "");
			throw new GoogleDriveError(
				`Google Drive API error (${response.status}): ${body}`,
				response.status,
			);
		}

		// Some endpoints (e.g. DELETE) return 204 No Content
		if (response.status === 204) {
			return undefined as unknown as T;
		}

		return response.json() as Promise<T>;
	}

	// ── GoogleDriveProvider Implementation ─────────────────────────────────

	async authenticate(): Promise<string> {
		return this.auth.getAuthUrl(DRIVE_SCOPES);
	}

	async handleCallback(code: string): Promise<GoogleAuthConfig> {
		const tokens = await this.auth.exchangeCode(code);
		return {
			...this.config,
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
		};
	}

	async refreshAccessToken(): Promise<string> {
		return this.auth.refreshToken();
	}

	async listFiles(folderId?: string, query?: string, pageSize = 100): Promise<DriveFileList> {
		const qParts: string[] = ["trashed = false"];
		if (folderId) qParts.push(`'${folderId}' in parents`);
		if (query) qParts.push(query);

		const params = new URLSearchParams({
			q: qParts.join(" and "),
			pageSize: String(pageSize),
			fields: `nextPageToken,files(${FILE_FIELDS})`,
			orderBy: "modifiedTime desc",
		});

		const data = await this.request<{
			files: Array<Record<string, unknown>>;
			nextPageToken?: string;
		}>(`${DRIVE_API_BASE}/files?${params.toString()}`);

		return {
			files: (data.files ?? []).map(toDriveFile),
			nextPageToken: data.nextPageToken,
		};
	}

	async getFile(fileId: string): Promise<DriveFile> {
		const params = new URLSearchParams({ fields: FILE_FIELDS });
		const raw = await this.request<Record<string, unknown>>(
			`${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?${params.toString()}`,
		);
		return toDriveFile(raw);
	}

	async uploadFile(
		name: string,
		content: Buffer | ReadableStream,
		mimeType: string,
		folderId?: string,
	): Promise<DriveFile> {
		// Use multipart upload for simplicity (supports files up to 5 MB).
		// For larger files a resumable upload should be used.
		const metadata: Record<string, unknown> = { name, mimeType };
		if (folderId) metadata.parents = [folderId];

		const boundary = "neogesys_boundary";
		const bodyBuffer =
			content instanceof Buffer ? content : await streamToBuffer(content as ReadableStream);

		// Build multipart body
		const metadataJson = JSON.stringify(metadata);
		const parts = [
			`--${boundary}\r\n`,
			"Content-Type: application/json; charset=UTF-8\r\n\r\n",
			metadataJson,
			`\r\n--${boundary}\r\n`,
			`Content-Type: ${mimeType}\r\n\r\n`,
		];

		const preamble = Buffer.from(parts.join(""), "utf-8");
		const epilogue = Buffer.from(`\r\n--${boundary}--`, "utf-8");
		const body = Buffer.concat([preamble, bodyBuffer, epilogue]);

		const params = new URLSearchParams({
			uploadType: "multipart",
			fields: FILE_FIELDS,
		});

		const raw = await this.request<Record<string, unknown>>(
			`${DRIVE_UPLOAD_BASE}/files?${params.toString()}`,
			{
				method: "POST",
				headers: {
					"Content-Type": `multipart/related; boundary=${boundary}`,
					"Content-Length": String(body.byteLength),
				},
				body,
			},
		);

		return toDriveFile(raw);
	}

	async createFolder(name: string, parentId?: string): Promise<DriveFile> {
		const metadata: Record<string, unknown> = {
			name,
			mimeType: FOLDER_MIME_TYPE,
		};
		if (parentId) metadata.parents = [parentId];

		const params = new URLSearchParams({ fields: FILE_FIELDS });
		const raw = await this.request<Record<string, unknown>>(
			`${DRIVE_API_BASE}/files?${params.toString()}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(metadata),
			},
		);

		return toDriveFile(raw);
	}

	async deleteFile(fileId: string): Promise<void> {
		await this.request<void>(`${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}`, {
			method: "DELETE",
		});
	}

	async shareFile(
		fileId: string,
		email: string,
		role: "reader" | "writer" | "commenter",
	): Promise<void> {
		await this.request(`${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}/permissions`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ type: "user", role, emailAddress: email }),
		});
	}

	async getStorageQuota(): Promise<{ used: number; total: number }> {
		const params = new URLSearchParams({
			fields: "storageQuota(usage,limit)",
		});

		const data = await this.request<{
			storageQuota: { usage: string; limit: string };
		}>(`${DRIVE_API_BASE}/about?${params.toString()}`);

		return {
			used: Number(data.storageQuota.usage ?? 0),
			total: Number(data.storageQuota.limit ?? 0),
		};
	}

	async exportFile(fileId: string, mimeType: string): Promise<Buffer> {
		const token = await this.auth.getAccessToken();
		const params = new URLSearchParams({ mimeType });

		const response = await fetch(
			`${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}/export?${params.toString()}`,
			{ headers: { Authorization: `Bearer ${token}` } },
		);

		if (!response.ok) {
			const body = await response.text().catch(() => "");
			throw new GoogleDriveError(
				`Errore export file (${response.status}): ${body}`,
				response.status,
			);
		}

		const arrayBuffer = await response.arrayBuffer();
		return Buffer.from(arrayBuffer);
	}

	// ── Tenant Helpers ────────────────────────────────────────────────────

	/**
	 * Find or create the root folder for a tenant's documents in Google Drive.
	 * The folder is named "NeoGesys - {tenantSlug}".
	 */
	async ensureTenantFolder(tenantSlug: string): Promise<DriveFile> {
		const folderName = `NeoGesys - ${tenantSlug}`;

		// Search for an existing folder with this name at root level
		const existing = await this.listFiles(
			undefined,
			`name = '${folderName}' and mimeType = '${FOLDER_MIME_TYPE}' and 'root' in parents`,
		);

		if (existing.files.length > 0) {
			return existing.files[0]!;
		}

		return this.createFolder(folderName);
	}
}

// ─── Utilities ──────────────────────────────────────────────────────────────

async function streamToBuffer(stream: ReadableStream): Promise<Buffer> {
	const reader = stream.getReader();
	const chunks: Uint8Array[] = [];

	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		if (value) chunks.push(value);
	}

	return Buffer.concat(chunks);
}
