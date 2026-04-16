import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { eq, and } from "drizzle-orm";
import { db } from "@neogesys/db";
import { tenantIntegrations } from "@neogesys/db/schema";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export class TenantVault {
  private readonly masterKey: Buffer;

  constructor(masterKey: Buffer) {
    if (masterKey.length !== 32) {
      throw new Error(
        `VAULT_MASTER_KEY must be exactly 32 bytes (256 bits). Received ${masterKey.length} bytes.`,
      );
    }
    this.masterKey = masterKey;
  }

  /**
   * Encrypt a credentials object using AES-256-GCM.
   * Returns a base64 string containing: IV (12 bytes) + authTag (16 bytes) + ciphertext.
   */
  encrypt(plain: Record<string, string>): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.masterKey, iv);

    const plaintext = JSON.stringify(plain);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    const result = Buffer.concat([iv, authTag, encrypted]);
    return result.toString("base64");
  }

  /**
   * Decrypt a base64 string produced by `encrypt` back into a credentials object.
   */
  decrypt(encrypted: string): Record<string, string> {
    const buffer = Buffer.from(encrypted, "base64");

    if (buffer.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error("Invalid encrypted data: buffer too short");
    }

    const iv = buffer.subarray(0, IV_LENGTH);
    const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, this.masterKey, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return JSON.parse(decrypted.toString("utf8")) as Record<string, string>;
  }

  /**
   * Retrieve and decrypt credentials for a tenant's integration provider.
   * Returns null if no active integration is found.
   */
  async getCredentials(
    tenantId: string,
    provider: string,
  ): Promise<Record<string, string> | null> {
    const [row] = await db
      .select({
        credenziali: tenantIntegrations.credenziali,
        attivo: tenantIntegrations.attivo,
      })
      .from(tenantIntegrations)
      .where(
        and(
          eq(tenantIntegrations.tenantId, tenantId),
          eq(tenantIntegrations.provider, provider),
          eq(tenantIntegrations.attivo, true),
        ),
      )
      .limit(1);

    if (!row?.credenziali) {
      return null;
    }

    return this.decrypt(row.credenziali);
  }

  /**
   * Encrypt and upsert credentials for a tenant's integration provider.
   */
  async setCredentials(
    tenantId: string,
    provider: string,
    tipo: string,
    credentials: Record<string, string>,
    configurazione?: Record<string, unknown>,
  ): Promise<void> {
    const encrypted = this.encrypt(credentials);

    await db
      .insert(tenantIntegrations)
      .values({
        tenantId,
        provider,
        tipo,
        credenziali: encrypted,
        configurazione: configurazione ?? null,
        attivo: true,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [tenantIntegrations.tenantId, tenantIntegrations.provider],
        set: {
          tipo,
          credenziali: encrypted,
          configurazione: configurazione ?? null,
          attivo: true,
          updatedAt: new Date(),
        },
      });
  }

  /**
   * Record the outcome of a connection test for a tenant's integration.
   */
  async testConnection(
    tenantId: string,
    provider: string,
  ): Promise<{ esito: string; messaggio: string }> {
    const credentials = await this.getCredentials(tenantId, provider);

    if (!credentials) {
      const result = {
        esito: "errore",
        messaggio: "Nessuna integrazione attiva trovata per questo provider",
      };

      await this.updateTestResult(tenantId, provider, result);
      return result;
    }

    // Basic connectivity check: credentials exist and can be decrypted
    const result = {
      esito: "ok",
      messaggio: "Credenziali valide e decifrate correttamente",
    };

    await this.updateTestResult(tenantId, provider, result);
    return result;
  }

  private async updateTestResult(
    tenantId: string,
    provider: string,
    result: { esito: string; messaggio: string },
  ): Promise<void> {
    await db
      .update(tenantIntegrations)
      .set({
        ultimoTest: new Date(),
        ultimoTestEsito: result.esito,
        ultimoTestMessaggio: result.messaggio,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(tenantIntegrations.tenantId, tenantId),
          eq(tenantIntegrations.provider, provider),
        ),
      );
  }
}

/**
 * Create a TenantVault instance from the VAULT_MASTER_KEY environment variable.
 * The key must be a 64-character hex string (32 bytes).
 */
export function createVault(): TenantVault {
  const keyHex = process.env.VAULT_MASTER_KEY;
  if (!keyHex) {
    throw new Error("VAULT_MASTER_KEY environment variable is not set");
  }

  const keyBuffer = Buffer.from(keyHex, "hex");
  return new TenantVault(keyBuffer);
}
