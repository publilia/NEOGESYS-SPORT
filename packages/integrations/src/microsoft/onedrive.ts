import { MicrosoftAuthError, MicrosoftOAuthClient, ONEDRIVE_SCOPES } from "./auth";
import type {
	MicrosoftAuthConfig,
	OneDriveFile,
	OneDriveFileList,
	OneDriveProvider,
	ShareLink,
} from "./types";

// ─── Constants ──────────────────────────────────────────────────────────────

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
/** Files smaller than this threshold use simple PUT upload. */
const LARGE_FILE_THRESHOLD = 4 * 1024 * 1024; // 4 MB
/** Upload session chunk size (must be a multiple of 320 KiB). */
const UPLOAD_CHUNK_SIZE = 10 * 320 * 1024; // ~3.2 MB

// ─── Helpers ────────────────────────────────────────────────────────────────

interface GraphErrorBody {
	error?: {
		code?: string;
		message?: string;
	};
}

async function throwIfGraphError(response: Response, context: string): Promise<void> {
	if (response.ok) return;

	let body: GraphErrorBody | undefined;
	try {
		body = (await response.json()) as GraphErrorBody;
	} catch {
		// body not parseable, fall through
	}

	const code = body?.error?.code ?? String(response.status);
	const message = body?.error?.message ?? response.statusText;
	throw new MicrosoftAuthError(`${context}: [${code}] ${message}`, code, response.status);
}

function mapDriveItem(item: Record<string, unknown>): OneDriveFile {
	return {
		id: item.id as string,
		name: item.name as string,
		size: (item.size as number) ?? 0,
		mimeType:
			((item.file as Record<string, unknown> | undefined)?.mimeType as string) ??
			"application/octet-stream",
		createdDateTime: item.createdDateTime as string,
		lastModifiedDateTime: item.lastModifiedDateTime as string,
		webUrl: item.webUrl as string,
		downloadUrl: (item as Record<string, unknown>)["@microsoft.graph.downloadUrl"] as
			| string
			| undefined,
		parentReference: {
			id: (item.parentReference as Record<string, unknown> | undefined)?.id as string | undefined,
			driveId: (item.parentReference as Record<string, unknown> | undefined)?.driveId as
				| string
				| undefined,
			path: (item.parentReference as Record<string, unknown> | undefined)?.path as
				| string
				| undefined,
		},
		file: item.file as OneDriveFile["file"],
		folder: item.folder as OneDriveFile["folder"],
	};
}

// ─── Service ────────────────────────────────────────────────────────────────

/**
 * OneDrive service built on the Microsoft Graph API v1.0.
 *
 * Uses the lightweight {@link MicrosoftOAuthClient} for authentication (no MSAL).
 * All tenant documents are scoped to `/NeogesysSport/{tenantSlug}/`.
 */
export class OneDriveService implements OneDriveProvider {
	private readonly auth: MicrosoftOAuthClient;
	private readonly tenantSlug: string;

	constructor(config: MicrosoftAuthConfig, tenantSlug: string) {
		this.auth = new MicrosoftOAuthClient(config);
		this.tenantSlug = tenantSlug;
	}

	// ── Auth helpers ────────────────────────────────────────────────────────

	async authenticate(): Promise<string> {
		return this.auth.getAuthUrl([...ONEDRIVE_SCOPES]);
	}

	async handleCallback(code: string): Promise<MicrosoftAuthConfig> {
		return this.auth.exchangeCode(code, [...ONEDRIVE_SCOPES]);
	}

	async refreshAccessToken(): Promise<string> {
		return this.auth.refreshToken();
	}

	// ── Private helpers ─────────────────────────────────────────────────────

	private async headers(): Promise<Record<string, string>> {
		const token = await this.auth.getAccessToken();
		return {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		};
	}

	/** Ensure the per-tenant root folder exists, returning its ID. */
	private async ensureTenantFolder(): Promise<string> {
		const h = await this.headers();
		const folderPath = `/NeogesysSport/${this.tenantSlug}`;

		// Try to get existing folder
		const getRes = await fetch(`${GRAPH_BASE}/me/drive/root:${encodeURI(folderPath)}`, {
			headers: h,
		});

		if (getRes.ok) {
			const data = (await getRes.json()) as Record<string, unknown>;
			return data.id as string;
		}

		// Create parent first (/NeogesysSport)
		const parentRes = await fetch(`${GRAPH_BASE}/me/drive/root/children`, {
			method: "POST",
			headers: h,
			body: JSON.stringify({
				name: "NeogesysSport",
				folder: {},
				"@microsoft.graph.conflictBehavior": "replace",
			}),
		});
		if (!parentRes.ok && parentRes.status !== 409) {
			await throwIfGraphError(parentRes, "Creazione cartella NeogesysSport");
		}
		const parentData = parentRes.ok ? ((await parentRes.json()) as Record<string, unknown>) : null;
		const parentId = parentData?.id as string | undefined;

		// Create tenant sub-folder
		const endpoint = parentId
			? `${GRAPH_BASE}/me/drive/items/${parentId}/children`
			: `${GRAPH_BASE}/me/drive/root:/NeogesysSport:/children`;

		const childRes = await fetch(endpoint, {
			method: "POST",
			headers: h,
			body: JSON.stringify({
				name: this.tenantSlug,
				folder: {},
				"@microsoft.graph.conflictBehavior": "replace",
			}),
		});

		await throwIfGraphError(childRes, "Creazione cartella tenant");
		const childData = (await childRes.json()) as Record<string, unknown>;
		return childData.id as string;
	}

	// ── File Operations ─────────────────────────────────────────────────────

	async listFiles(folderId?: string, query?: string, top = 50): Promise<OneDriveFileList> {
		const h = await this.headers();
		let resolvedFolderId = folderId;

		if (!resolvedFolderId) {
			resolvedFolderId = await this.ensureTenantFolder();
		}

		let url = `${GRAPH_BASE}/me/drive/items/${resolvedFolderId}/children?$top=${top}`;
		if (query) {
			url += `&$filter=contains(name,'${encodeURIComponent(query)}')`;
		}

		const res = await fetch(url, { headers: h });
		await throwIfGraphError(res, "Elenco file OneDrive");

		const data = (await res.json()) as Record<string, unknown>;
		const items = (data.value as Array<Record<string, unknown>>) ?? [];

		return {
			files: items.map(mapDriveItem),
			nextLink: data["@odata.nextLink"] as string | undefined,
		};
	}

	async getFile(fileId: string): Promise<OneDriveFile> {
		const h = await this.headers();
		const res = await fetch(`${GRAPH_BASE}/me/drive/items/${fileId}`, { headers: h });
		await throwIfGraphError(res, "Recupero file OneDrive");

		const data = (await res.json()) as Record<string, unknown>;
		return mapDriveItem(data);
	}

	async uploadFile(name: string, content: Buffer, parentId?: string): Promise<OneDriveFile> {
		if (content.byteLength >= LARGE_FILE_THRESHOLD) {
			const stream = new ReadableStream({
				start(controller) {
					controller.enqueue(new Uint8Array(content));
					controller.close();
				},
			});
			return this.uploadLargeFile(name, content.byteLength, stream, parentId);
		}

		const resolvedParent = parentId ?? (await this.ensureTenantFolder());
		const token = await this.auth.getAccessToken();

		const url = `${GRAPH_BASE}/me/drive/items/${resolvedParent}:/${encodeURIComponent(name)}:/content`;
		const res = await fetch(url, {
			method: "PUT",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/octet-stream",
			},
			body: content,
		});

		await throwIfGraphError(res, "Upload file OneDrive");
		const data = (await res.json()) as Record<string, unknown>;
		return mapDriveItem(data);
	}

	async uploadLargeFile(
		name: string,
		size: number,
		stream: ReadableStream,
		parentId?: string,
	): Promise<OneDriveFile> {
		const resolvedParent = parentId ?? (await this.ensureTenantFolder());
		const h = await this.headers();

		// 1. Create upload session
		const sessionUrl = `${GRAPH_BASE}/me/drive/items/${resolvedParent}:/${encodeURIComponent(name)}:/createUploadSession`;
		const sessionRes = await fetch(sessionUrl, {
			method: "POST",
			headers: h,
			body: JSON.stringify({
				item: {
					"@microsoft.graph.conflictBehavior": "replace",
					name,
				},
			}),
		});

		await throwIfGraphError(sessionRes, "Creazione sessione upload");
		const sessionData = (await sessionRes.json()) as Record<string, unknown>;
		const uploadUrl = sessionData.uploadUrl as string;

		// 2. Read stream into chunks and upload sequentially
		const reader = stream.getReader();
		let offset = 0;
		let buffer: Uint8Array = new Uint8Array(0);
		let lastResponse: Record<string, unknown> | null = null;

		const appendBuffer = (existing: Uint8Array, chunk: Uint8Array): Uint8Array => {
			const combined = new Uint8Array(existing.length + chunk.length);
			combined.set(existing);
			combined.set(chunk, existing.length);
			return combined;
		};

		while (offset < size) {
			// Fill buffer up to UPLOAD_CHUNK_SIZE
			while (buffer.length < UPLOAD_CHUNK_SIZE) {
				const { done, value } = await reader.read();
				if (done) break;
				const chunkBytes = value as Uint8Array;
				const copy = new Uint8Array(chunkBytes.length);
				copy.set(chunkBytes);
				buffer = appendBuffer(buffer, copy);
			}

			const chunkSize = Math.min(buffer.length, UPLOAD_CHUNK_SIZE);
			const chunk = buffer.slice(0, chunkSize);
			buffer = buffer.slice(chunkSize);

			const rangeEnd = Math.min(offset + chunkSize - 1, size - 1);

			const chunkRes = await fetch(uploadUrl, {
				method: "PUT",
				headers: {
					"Content-Length": String(chunkSize),
					"Content-Range": `bytes ${offset}-${rangeEnd}/${size}`,
				},
				body: chunk,
			});

			if (!chunkRes.ok && chunkRes.status !== 202) {
				await throwIfGraphError(chunkRes, "Upload chunk OneDrive");
			}

			if (chunkRes.status === 200 || chunkRes.status === 201) {
				lastResponse = (await chunkRes.json()) as Record<string, unknown>;
			}

			offset += chunkSize;
		}

		if (!lastResponse) {
			throw new MicrosoftAuthError("Upload completato ma nessuna risposta dal server");
		}

		return mapDriveItem(lastResponse);
	}

	async createFolder(name: string, parentId?: string): Promise<OneDriveFile> {
		const resolvedParent = parentId ?? (await this.ensureTenantFolder());
		const h = await this.headers();

		const res = await fetch(`${GRAPH_BASE}/me/drive/items/${resolvedParent}/children`, {
			method: "POST",
			headers: h,
			body: JSON.stringify({
				name,
				folder: {},
				"@microsoft.graph.conflictBehavior": "rename",
			}),
		});

		await throwIfGraphError(res, "Creazione cartella OneDrive");
		const data = (await res.json()) as Record<string, unknown>;
		return mapDriveItem(data);
	}

	async deleteFile(fileId: string): Promise<void> {
		const h = await this.headers();
		const res = await fetch(`${GRAPH_BASE}/me/drive/items/${fileId}`, {
			method: "DELETE",
			headers: h,
		});

		if (res.status !== 204 && !res.ok) {
			await throwIfGraphError(res, "Eliminazione file OneDrive");
		}
	}

	async shareFile(fileId: string, email: string, role: "read" | "write"): Promise<ShareLink> {
		const h = await this.headers();

		const res = await fetch(`${GRAPH_BASE}/me/drive/items/${fileId}/invite`, {
			method: "POST",
			headers: h,
			body: JSON.stringify({
				requireSignIn: true,
				sendInvitation: true,
				roles: [role === "write" ? "write" : "read"],
				recipients: [{ email }],
			}),
		});

		await throwIfGraphError(res, "Condivisione file OneDrive");
		const data = (await res.json()) as Record<string, unknown>;
		const permissions = (data.value as Array<Record<string, unknown>>) ?? [];
		const first = permissions[0] ?? {};

		return {
			id: (first.id as string) ?? "",
			link: {
				webUrl: ((first.link as Record<string, unknown>)?.webUrl as string) ?? "",
				type: role,
			},
		};
	}

	async getStorageQuota(): Promise<{ used: number; remaining: number; total: number }> {
		const h = await this.headers();
		const res = await fetch(`${GRAPH_BASE}/me/drive`, { headers: h });
		await throwIfGraphError(res, "Recupero quota storage OneDrive");

		const data = (await res.json()) as Record<string, unknown>;
		const quota = data.quota as Record<string, unknown>;

		return {
			used: (quota.used as number) ?? 0,
			remaining: (quota.remaining as number) ?? 0,
			total: (quota.total as number) ?? 0,
		};
	}

	async downloadFile(fileId: string): Promise<Buffer> {
		const h = await this.headers();
		const res = await fetch(`${GRAPH_BASE}/me/drive/items/${fileId}/content`, {
			headers: h,
			redirect: "follow",
		});

		await throwIfGraphError(res, "Download file OneDrive");
		const arrayBuffer = await res.arrayBuffer();
		return Buffer.from(arrayBuffer);
	}

	async searchFiles(query: string): Promise<OneDriveFileList> {
		const h = await this.headers();
		const res = await fetch(
			`${GRAPH_BASE}/me/drive/root/search(q='${encodeURIComponent(query)}')`,
			{ headers: h },
		);

		await throwIfGraphError(res, "Ricerca file OneDrive");
		const data = (await res.json()) as Record<string, unknown>;
		const items = (data.value as Array<Record<string, unknown>>) ?? [];

		return {
			files: items.map(mapDriveItem),
			nextLink: data["@odata.nextLink"] as string | undefined,
		};
	}
}
