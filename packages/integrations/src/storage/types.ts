// ─── Unified Cloud Storage Types ───────────────────────────────────────────
//
// Provider-agnostic storage types that abstract Google Drive, OneDrive,
// and local S3-compatible storage behind a single interface.
// ────────────────────────────────────────────────────────────────────────────

/** The backend storage provider in use for a given tenant. */
export type StorageProviderType = "google_drive" | "onedrive" | "local_s3";

// ─── Unified Data Types ────────────────────────────────────────────────────

export interface UnifiedFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
  modifiedAt: string;
  webUrl?: string;
  downloadUrl?: string;
  parentId?: string;
  isFolder: boolean;
  provider: StorageProviderType;
  /** The original provider-specific file ID for direct API calls. */
  providerFileId: string;
}

export interface UnifiedFileList {
  files: UnifiedFile[];
  nextPageToken?: string;
}

export interface StorageQuota {
  used: number;
  total: number;
  remaining: number;
}

export interface ShareResult {
  shareUrl: string;
  shareId?: string;
}

// ─── Unified Provider Interface ────────────────────────────────────────────

export interface CloudStorageProvider {
  /** The type of storage provider. */
  readonly providerType: StorageProviderType;

  /**
   * List files in a folder. If no folderId is provided, lists root.
   */
  listFiles(
    folderId?: string,
    query?: string,
    pageSize?: number,
  ): Promise<UnifiedFileList>;

  /**
   * Upload a file to storage.
   *
   * @param name     - File name including extension
   * @param content  - File content as a Buffer
   * @param mimeType - MIME type of the file
   * @param folderId - Optional parent folder ID
   */
  uploadFile(
    name: string,
    content: Buffer,
    mimeType: string,
    folderId?: string,
  ): Promise<UnifiedFile>;

  /**
   * Download a file by its ID.
   *
   * @returns The file content as a Buffer
   */
  downloadFile(fileId: string): Promise<Buffer>;

  /**
   * Delete a file or folder by its ID.
   */
  deleteFile(fileId: string): Promise<void>;

  /**
   * Create a folder.
   *
   * @param name     - Folder name
   * @param parentId - Optional parent folder ID
   */
  createFolder(name: string, parentId?: string): Promise<UnifiedFile>;

  /**
   * Share a file with another user via email.
   *
   * @param fileId - File to share
   * @param email  - Recipient email
   * @param role   - Access level
   */
  shareFile(
    fileId: string,
    email: string,
    role: "reader" | "writer",
  ): Promise<ShareResult>;

  /**
   * Get the storage quota for the authenticated account.
   */
  getQuota(): Promise<StorageQuota>;
}
