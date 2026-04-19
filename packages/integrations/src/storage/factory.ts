import { db } from "@neogesys/db";
import { tenantIntegrations } from "@neogesys/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import type { GoogleDriveService } from "../google/drive";
import { getGoogleDriveProvider } from "../google/factory";
import type { DriveFile } from "../google/types";
import { getOneDriveProvider } from "../microsoft/factory";
import type { OneDriveService } from "../microsoft/onedrive";
import type { OneDriveFile } from "../microsoft/types";
import { LocalStorageProvider } from "./local";
import type {
	CloudStorageProvider,
	ShareResult,
	StorageProviderType,
	StorageQuota,
	UnifiedFile,
	UnifiedFileList,
} from "./types";

// ─── Provider Detection ────────────────────────────────────────────────────

async function detectStorageProvider(tenantId: string): Promise<StorageProviderType> {
	const integrations = await db
		.select({ provider: tenantIntegrations.provider })
		.from(tenantIntegrations)
		.where(
			and(
				eq(tenantIntegrations.tenantId, tenantId),
				inArray(tenantIntegrations.provider, ["google_drive", "microsoft_onedrive"]),
				eq(tenantIntegrations.attivo, true),
			),
		)
		.limit(1);

	if (integrations.length === 0) {
		// Fallback to local S3-compatible storage
		return "local_s3";
	}

	const provider = integrations[0]?.provider;
	if (provider === "google_drive") return "google_drive";
	if (provider === "microsoft_onedrive") return "onedrive";

	return "local_s3";
}

// ─── Google Drive Adapter ──────────────────────────────────────────────────

function toUnifiedDriveFile(file: DriveFile): UnifiedFile {
	return {
		id: file.id,
		name: file.name,
		mimeType: file.mimeType,
		size: file.size,
		createdAt: file.createdTime,
		modifiedAt: file.modifiedTime,
		webUrl: file.webViewLink,
		downloadUrl: file.webContentLink,
		parentId: file.parents[0],
		isFolder: file.mimeType === "application/vnd.google-apps.folder",
		provider: "google_drive",
		providerFileId: file.id,
	};
}

class GoogleDriveAdapter implements CloudStorageProvider {
	readonly providerType: StorageProviderType = "google_drive";

	constructor(private readonly service: GoogleDriveService) {}

	async listFiles(folderId?: string, query?: string, pageSize?: number): Promise<UnifiedFileList> {
		const result = await this.service.listFiles(folderId, query, pageSize);
		return {
			files: result.files.map(toUnifiedDriveFile),
			nextPageToken: result.nextPageToken,
		};
	}

	async uploadFile(
		name: string,
		content: Buffer,
		mimeType: string,
		folderId?: string,
	): Promise<UnifiedFile> {
		const file = await this.service.uploadFile(name, content, mimeType, folderId);
		return toUnifiedDriveFile(file);
	}

	async downloadFile(fileId: string): Promise<Buffer> {
		return this.service.exportFile(fileId, "application/octet-stream");
	}

	async deleteFile(fileId: string): Promise<void> {
		await this.service.deleteFile(fileId);
	}

	async createFolder(name: string, parentId?: string): Promise<UnifiedFile> {
		const folder = await this.service.createFolder(name, parentId);
		return toUnifiedDriveFile(folder);
	}

	async shareFile(fileId: string, email: string, role: "reader" | "writer"): Promise<ShareResult> {
		const driveRole = role === "writer" ? "writer" : "reader";
		await this.service.shareFile(fileId, email, driveRole);
		return { shareUrl: `https://drive.google.com/file/d/${fileId}/view` };
	}

	async getQuota(): Promise<StorageQuota> {
		const quota = await this.service.getStorageQuota();
		return {
			used: quota.used,
			total: quota.total,
			remaining: quota.total - quota.used,
		};
	}
}

// ─── OneDrive Adapter ──────────────────────────────────────────────────────

function toUnifiedOneDriveFile(file: OneDriveFile): UnifiedFile {
	return {
		id: file.id,
		name: file.name,
		mimeType: file.file?.mimeType ?? (file.folder ? "folder" : "application/octet-stream"),
		size: file.size,
		createdAt: file.createdDateTime,
		modifiedAt: file.lastModifiedDateTime,
		webUrl: file.webUrl,
		downloadUrl: file.downloadUrl,
		parentId: file.parentReference.id,
		isFolder: !!file.folder,
		provider: "onedrive",
		providerFileId: file.id,
	};
}

class OneDriveAdapter implements CloudStorageProvider {
	readonly providerType: StorageProviderType = "onedrive";

	constructor(private readonly service: OneDriveService) {}

	async listFiles(folderId?: string, query?: string, pageSize?: number): Promise<UnifiedFileList> {
		const result = await this.service.listFiles(folderId, query, pageSize);
		return {
			files: result.files.map(toUnifiedOneDriveFile),
			nextLink: result.nextLink,
		} as UnifiedFileList;
	}

	async uploadFile(
		name: string,
		content: Buffer,
		_mimeType: string,
		parentId?: string,
	): Promise<UnifiedFile> {
		const file = await this.service.uploadFile(name, content, parentId);
		return toUnifiedOneDriveFile(file);
	}

	async downloadFile(fileId: string): Promise<Buffer> {
		return this.service.downloadFile(fileId);
	}

	async deleteFile(fileId: string): Promise<void> {
		await this.service.deleteFile(fileId);
	}

	async createFolder(name: string, parentId?: string): Promise<UnifiedFile> {
		const folder = await this.service.createFolder(name, parentId);
		return toUnifiedOneDriveFile(folder);
	}

	async shareFile(fileId: string, email: string, role: "reader" | "writer"): Promise<ShareResult> {
		const odRole = role === "writer" ? "write" : "read";
		const link = await this.service.shareFile(fileId, email, odRole);
		return {
			shareUrl: link.link.webUrl,
			shareId: link.id,
		};
	}

	async getQuota(): Promise<StorageQuota> {
		const quota = await this.service.getStorageQuota();
		return {
			used: quota.used,
			total: quota.total,
			remaining: quota.remaining,
		};
	}
}

// ─── Factory ───────────────────────────────────────────────────────────────

/**
 * Get the unified CloudStorageProvider for a tenant.
 *
 * Automatically detects which storage backend (Google Drive, OneDrive,
 * or local S3) is configured for the tenant, resolves credentials from
 * the vault, and returns a provider instance wrapped in the unified
 * CloudStorageProvider interface.
 *
 * Falls back to local S3/MinIO storage when no cloud provider is configured.
 *
 * @param tenantId - The tenant ID to resolve the storage provider for
 */
export async function getStorageProvider(tenantId: string): Promise<CloudStorageProvider> {
	const providerType = await detectStorageProvider(tenantId);

	if (providerType === "google_drive") {
		const driveService = await getGoogleDriveProvider(tenantId);
		return new GoogleDriveAdapter(driveService);
	}

	if (providerType === "onedrive") {
		const onedriveService = await getOneDriveProvider(tenantId);
		return new OneDriveAdapter(onedriveService);
	}

	// Fallback: local S3-compatible storage
	return new LocalStorageProvider(tenantId);
}
