import type {
	CloudStorageProvider,
	ShareResult,
	StorageProviderType,
	StorageQuota,
	UnifiedFile,
	UnifiedFileList,
} from "./types";

// ─── S3 Configuration ──────────────────────────────────────────────────────

interface S3Config {
	endpoint: string;
	region: string;
	bucket: string;
	accessKeyId: string;
	secretAccessKey: string;
	publicUrl?: string;
}

function getS3Config(): S3Config {
	return {
		endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
		region: process.env.S3_REGION ?? "us-east-1",
		bucket: process.env.S3_BUCKET ?? "neogesys-sport",
		accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "minioadmin",
		secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "minioadmin",
		publicUrl: process.env.S3_PUBLIC_URL,
	};
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function tenantPrefix(tenantId: string, path?: string): string {
	const base = `tenants/${tenantId}`;
	return path ? `${base}/${path}` : base;
}

/**
 * Generate an ISO date for the current time.
 */
function nowISO(): string {
	return new Date().toISOString();
}

/**
 * Generate a simple UUID v4-like identifier.
 */
function generateId(): string {
	return crypto.randomUUID();
}

/**
 * Build a signed URL for the S3 object.
 * In production this would use proper AWS Signature V4; here we return
 * a direct MinIO-compatible URL.
 */
function buildUrl(config: S3Config, key: string): string {
	const base = config.publicUrl ?? config.endpoint;
	return `${base}/${config.bucket}/${key}`;
}

/**
 * Make an authenticated request to the S3-compatible API.
 *
 * This is a simplified implementation. In production, use the AWS SDK v3
 * or a lightweight S3 client with proper SigV4 signing.
 */
async function s3Fetch(
	config: S3Config,
	method: string,
	key: string,
	body?: Buffer | string,
	headers?: Record<string, string>,
): Promise<Response> {
	const url = `${config.endpoint}/${config.bucket}/${key}`;

	// Basic auth header for MinIO compatibility
	const authToken = Buffer.from(`${config.accessKeyId}:${config.secretAccessKey}`).toString(
		"base64",
	);

	return fetch(url, {
		method,
		headers: {
			Authorization: `Basic ${authToken}`,
			...headers,
		},
		body: body ?? undefined,
	});
}

// ─── LocalStorageProvider ──────────────────────────────────────────────────

/**
 * S3-compatible (MinIO / AWS S3) storage provider.
 *
 * Used as the default fallback when no cloud storage (Google Drive,
 * OneDrive) is configured for a tenant. Files are stored in an
 * S3-compatible bucket under a tenant-specific prefix.
 *
 * Environment variables:
 *  - S3_ENDPOINT          (default: http://localhost:9000)
 *  - S3_REGION            (default: us-east-1)
 *  - S3_BUCKET            (default: neogesys-sport)
 *  - S3_ACCESS_KEY_ID     (default: minioadmin)
 *  - S3_SECRET_ACCESS_KEY (default: minioadmin)
 *  - S3_PUBLIC_URL        (optional, for public download URLs)
 */
export class LocalStorageProvider implements CloudStorageProvider {
	readonly providerType: StorageProviderType = "local_s3";
	private readonly config: S3Config;
	private readonly tenantId: string;

	/**
	 * In-memory file index. In production, this would be backed by a database
	 * table (e.g., `storage_files`) to persist metadata.
	 */
	private fileIndex: Map<string, UnifiedFile> = new Map();

	constructor(tenantId: string) {
		this.tenantId = tenantId;
		this.config = getS3Config();
	}

	async listFiles(folderId?: string, query?: string, pageSize = 50): Promise<UnifiedFileList> {
		const prefix = folderId ? tenantPrefix(this.tenantId, folderId) : tenantPrefix(this.tenantId);

		// List objects with the prefix
		const response = await s3Fetch(
			this.config,
			"GET",
			`?prefix=${encodeURIComponent(prefix)}&max-keys=${pageSize}`,
		);

		if (!response.ok) {
			return { files: [] };
		}

		// Parse the XML response (simplified)
		const xml = await response.text();
		const files: UnifiedFile[] = [];

		// Extract keys from ListBucketResult XML
		const keyMatches = xml.matchAll(/<Key>([^<]+)<\/Key>/g);
		for (const match of keyMatches) {
			const key = match[1];
			if (!key) continue;
			const name = key.split("/").pop() ?? key;

			if (query && !name.toLowerCase().includes(query.toLowerCase())) {
				continue;
			}

			files.push({
				id: key,
				name,
				mimeType: "application/octet-stream",
				size: 0,
				createdAt: nowISO(),
				modifiedAt: nowISO(),
				webUrl: buildUrl(this.config, key),
				downloadUrl: buildUrl(this.config, key),
				parentId: folderId,
				isFolder: key.endsWith("/"),
				provider: "local_s3",
				providerFileId: key,
			});
		}

		return { files };
	}

	async uploadFile(
		name: string,
		content: Buffer,
		mimeType: string,
		folderId?: string,
	): Promise<UnifiedFile> {
		const fileId = generateId();
		const key = folderId
			? tenantPrefix(this.tenantId, `${folderId}/${fileId}_${name}`)
			: tenantPrefix(this.tenantId, `${fileId}_${name}`);

		await s3Fetch(this.config, "PUT", key, content, {
			"Content-Type": mimeType,
		});

		const file: UnifiedFile = {
			id: fileId,
			name,
			mimeType,
			size: content.length,
			createdAt: nowISO(),
			modifiedAt: nowISO(),
			webUrl: buildUrl(this.config, key),
			downloadUrl: buildUrl(this.config, key),
			parentId: folderId,
			isFolder: false,
			provider: "local_s3",
			providerFileId: key,
		};

		this.fileIndex.set(fileId, file);
		return file;
	}

	async downloadFile(fileId: string): Promise<Buffer> {
		// Try to find the key from the file index
		const cached = this.fileIndex.get(fileId);
		const key = cached?.providerFileId ?? tenantPrefix(this.tenantId, fileId);

		const response = await s3Fetch(this.config, "GET", key);

		if (!response.ok) {
			throw new Error(`Errore download file S3: ${response.status} ${response.statusText}`);
		}

		const arrayBuffer = await response.arrayBuffer();
		return Buffer.from(arrayBuffer);
	}

	async deleteFile(fileId: string): Promise<void> {
		const cached = this.fileIndex.get(fileId);
		const key = cached?.providerFileId ?? tenantPrefix(this.tenantId, fileId);

		await s3Fetch(this.config, "DELETE", key);
		this.fileIndex.delete(fileId);
	}

	async createFolder(name: string, parentId?: string): Promise<UnifiedFile> {
		const folderId = generateId();
		const key = parentId
			? tenantPrefix(this.tenantId, `${parentId}/${folderId}_${name}/`)
			: tenantPrefix(this.tenantId, `${folderId}_${name}/`);

		// S3 folders are zero-byte objects with trailing slashes
		await s3Fetch(this.config, "PUT", key, Buffer.alloc(0));

		const folder: UnifiedFile = {
			id: folderId,
			name,
			mimeType: "folder",
			size: 0,
			createdAt: nowISO(),
			modifiedAt: nowISO(),
			webUrl: buildUrl(this.config, key),
			parentId,
			isFolder: true,
			provider: "local_s3",
			providerFileId: key,
		};

		this.fileIndex.set(folderId, folder);
		return folder;
	}

	async shareFile(
		fileId: string,
		_email: string,
		_role: "reader" | "writer",
	): Promise<ShareResult> {
		// S3 doesn't have native sharing; return the direct URL
		const cached = this.fileIndex.get(fileId);
		const key = cached?.providerFileId ?? tenantPrefix(this.tenantId, fileId);
		const url = buildUrl(this.config, key);

		return { shareUrl: url };
	}

	async getQuota(): Promise<StorageQuota> {
		// S3/MinIO doesn't expose per-user quota by default.
		// Return reasonable defaults; in production, track usage in the DB.
		return {
			used: 0,
			total: 10 * 1024 * 1024 * 1024, // 10 GB default limit
			remaining: 10 * 1024 * 1024 * 1024,
		};
	}
}
