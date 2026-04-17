import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../trpc/index";
import { TRPCError } from "@trpc/server";
import {
  MicrosoftOAuthClient,
  ONEDRIVE_SCOPES,
} from "@neogesys/integrations/microsoft";
import type { MicrosoftAuthConfig } from "@neogesys/integrations/microsoft";

// ─── Helpers ────────────────────────────────────────────────────────────────

function requireTenant(tenantId: string | undefined): string {
  if (!tenantId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Contesto tenant mancante." });
  }
  return tenantId;
}

function toMicrosoftConfig(creds: Record<string, string>): MicrosoftAuthConfig {
  return {
    clientId: creds.clientId ?? "",
    clientSecret: creds.clientSecret ?? "",
    tenantId: creds.azureTenantId ?? "common",
    redirectUri: creds.redirectUri ?? "",
    refreshToken: creds.refreshToken ?? "",
    accessToken: creds.accessToken,
  };
}

async function getOneDriveClient(
  tenantId: string,
  vault: { getCredentials(t: string, p: string): Promise<Record<string, string> | null> },
): Promise<MicrosoftOAuthClient> {
  const credentials = await vault.getCredentials(tenantId, "microsoft_onedrive");
  if (!credentials) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "OneDrive non configurato. Completare prima il flusso OAuth.",
    });
  }
  return new MicrosoftOAuthClient(toMicrosoftConfig(credentials));
}

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

async function graphFetch(
  client: MicrosoftOAuthClient,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const token = await client.getAccessToken();
  return fetch(`${GRAPH_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

// ─── Router ─────────────────────────────────────────────────────────────────

export const microsoftOneDriveRouter = router({
  /**
   * Start the OAuth flow for OneDrive.
   */
  startOAuth: adminProcedure
    .input(
      z.object({
        clientId: z.string().min(1),
        clientSecret: z.string().min(1),
        azureTenantId: z.string().default("common"),
        redirectUri: z.string().url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireTenant(ctx.tenant?.id);

      const client = new MicrosoftOAuthClient({
        clientId: input.clientId,
        clientSecret: input.clientSecret,
        tenantId: input.azureTenantId,
        redirectUri: input.redirectUri,
        refreshToken: "",
      });

      const authUrl = client.getAuthUrl([...ONEDRIVE_SCOPES]);
      return { authUrl };
    }),

  /**
   * Handle the OAuth callback: exchange code and persist tokens.
   */
  handleCallback: adminProcedure
    .input(
      z.object({
        code: z.string().min(1),
        clientId: z.string().min(1),
        clientSecret: z.string().min(1),
        azureTenantId: z.string().default("common"),
        redirectUri: z.string().url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.tenant?.id);

      const client = new MicrosoftOAuthClient({
        clientId: input.clientId,
        clientSecret: input.clientSecret,
        tenantId: input.azureTenantId,
        redirectUri: input.redirectUri,
        refreshToken: "",
      });

      const config = await client.exchangeCode(input.code, [...ONEDRIVE_SCOPES]);

      await ctx.vault.setCredentials(
        tenantId,
        "microsoft_onedrive",
        "storage",
        {
          clientId: input.clientId,
          clientSecret: input.clientSecret,
          azureTenantId: input.azureTenantId,
          redirectUri: input.redirectUri,
          refreshToken: config.refreshToken,
          accessToken: config.accessToken ?? "",
        },
      );

      return { success: true };
    }),

  /**
   * List files in a OneDrive folder (defaults to root).
   */
  listFiles: protectedProcedure
    .input(
      z.object({
        folderId: z.string().optional(),
        query: z.string().optional(),
        top: z.number().int().min(1).max(200).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.tenant?.id);
      const client = await getOneDriveClient(tenantId, ctx.vault);

      const folderPath = input.folderId
        ? `/me/drive/items/${input.folderId}/children`
        : "/me/drive/root/children";

      const params = new URLSearchParams({ $top: String(input.top) });
      if (input.query) {
        params.set("$filter", `contains(name,'${input.query}')`);
      }

      const response = await graphFetch(client, `${folderPath}?${params}`);
      const data = await response.json();

      return {
        files: (data.value ?? []) as Array<Record<string, unknown>>,
        nextLink: data["@odata.nextLink"] as string | undefined,
      };
    }),

  /**
   * Upload a document to OneDrive (< 4 MB simple upload).
   */
  uploadDocument: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(300),
        contentBase64: z.string().min(1),
        parentId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.tenant?.id);
      const client = await getOneDriveClient(tenantId, ctx.vault);

      const content = Buffer.from(input.contentBase64, "base64");
      const uploadPath = input.parentId
        ? `/me/drive/items/${input.parentId}:/${input.name}:/content`
        : `/me/drive/root:/${input.name}:/content`;

      const token = await client.getAccessToken();
      const response = await fetch(`${GRAPH_BASE}${uploadPath}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/octet-stream",
        },
        body: content,
      });

      if (!response.ok) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Errore upload OneDrive: ${response.statusText}`,
        });
      }

      return response.json();
    }),

  /**
   * Create a folder in OneDrive.
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
      const client = await getOneDriveClient(tenantId, ctx.vault);

      const parentPath = input.parentId
        ? `/me/drive/items/${input.parentId}/children`
        : "/me/drive/root/children";

      const response = await graphFetch(client, parentPath, {
        method: "POST",
        body: JSON.stringify({
          name: input.name,
          folder: {},
          "@microsoft.graph.conflictBehavior": "rename",
        }),
      });

      if (!response.ok) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Errore creazione cartella: ${response.statusText}`,
        });
      }

      return response.json();
    }),

  /**
   * Delete a file or folder.
   */
  deleteFile: adminProcedure
    .input(z.object({ fileId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.tenant?.id);
      const client = await getOneDriveClient(tenantId, ctx.vault);

      const response = await graphFetch(client, `/me/drive/items/${input.fileId}`, {
        method: "DELETE",
      });

      if (!response.ok && response.status !== 204) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Errore eliminazione: ${response.statusText}`,
        });
      }

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
        role: z.enum(["read", "write"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.tenant?.id);
      const client = await getOneDriveClient(tenantId, ctx.vault);

      const response = await graphFetch(
        client,
        `/me/drive/items/${input.fileId}/invite`,
        {
          method: "POST",
          body: JSON.stringify({
            requireSignIn: true,
            sendInvitation: true,
            roles: [input.role],
            recipients: [{ email: input.email }],
          }),
        },
      );

      if (!response.ok) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Errore condivisione: ${response.statusText}`,
        });
      }

      return response.json();
    }),

  /**
   * Get OneDrive storage quota.
   */
  getQuota: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = requireTenant(ctx.tenant?.id);
    const client = await getOneDriveClient(tenantId, ctx.vault);

    const response = await graphFetch(client, "/me/drive");
    const data = await response.json();
    const quota = data.quota as { used: number; remaining: number; total: number } | undefined;

    return {
      used: quota?.used ?? 0,
      remaining: quota?.remaining ?? 0,
      total: quota?.total ?? 0,
    };
  }),

  /**
   * Search files by query string.
   */
  searchFiles: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.tenant?.id);
      const client = await getOneDriveClient(tenantId, ctx.vault);

      const response = await graphFetch(
        client,
        `/me/drive/root/search(q='${encodeURIComponent(input.query)}')`,
      );
      const data = await response.json();

      return {
        files: (data.value ?? []) as Array<Record<string, unknown>>,
        nextLink: data["@odata.nextLink"] as string | undefined,
      };
    }),

  /**
   * Download a file's contents (returns a download URL).
   */
  downloadFile: protectedProcedure
    .input(z.object({ fileId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.tenant?.id);
      const client = await getOneDriveClient(tenantId, ctx.vault);

      const response = await graphFetch(client, `/me/drive/items/${input.fileId}`);
      const data = await response.json();

      return {
        downloadUrl: (data["@microsoft.graph.downloadUrl"] as string) ?? null,
        name: data.name as string,
        size: data.size as number,
      };
    }),
});
