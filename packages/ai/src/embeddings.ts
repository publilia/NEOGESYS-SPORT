import { getAIClient } from "./client";
import { db } from "@neogesys/db";
import { eq, and, sql } from "drizzle-orm";
import { sociEmbeddings } from "@neogesys/db/schema";

/**
 * Generate an embedding vector for a text string.
 *
 * Uses OpenAI's text-embedding-3-small model for embeddings.
 * If only Anthropic is available, falls back to a keyword-based approach.
 *
 * @param text - Text to generate embedding for
 * @param tenantId - Tenant ID for API key resolution
 * @returns Array of numbers representing the embedding vector
 */
export async function generateEmbedding(
  text: string,
  tenantId: string,
): Promise<number[]> {
  const client = await getAIClient(tenantId, "fast");

  if (client.provider === "openai" && client.openai) {
    const response = await client.openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      dimensions: 1536,
    });

    const embedding = response.data[0]?.embedding;
    if (!embedding) {
      throw new Error("Nessun embedding restituito dal modello");
    }
    return embedding;
  }

  // Fallback: use Anthropic to generate a pseudo-embedding via text analysis
  // In production, you would always use a proper embedding model
  if (client.provider === "anthropic" && client.anthropic) {
    const response = await client.anthropic.messages.create({
      model: client.model,
      max_tokens: 256,
      system:
        "Estrai le 20 parole chiave piu rilevanti dal testo. " +
        "Rispondi SOLO con le parole separate da virgola, senza altro testo.",
      messages: [
        {
          role: "user",
          content: text,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Nessuna risposta dal modello per l'estrazione keywords");
    }

    // Generate a simple hash-based vector as fallback
    // This is NOT a real embedding - just a placeholder for development
    const keywords = textBlock.text.split(",").map((k) => k.trim());
    const vector = new Array<number>(1536).fill(0);
    for (const keyword of keywords) {
      for (let i = 0; i < keyword.length; i++) {
        const charCode = keyword.charCodeAt(i);
        const idx = (charCode * (i + 1)) % 1536;
        vector[idx] = (vector[idx] ?? 0) + 0.1;
      }
    }

    // Normalize the vector
    const magnitude = Math.sqrt(
      vector.reduce((sum, val) => sum + val * val, 0),
    );
    if (magnitude > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] = (vector[i] ?? 0) / magnitude;
      }
    }

    return vector;
  }

  throw new Error("Nessun provider AI disponibile per generare embeddings");
}

/**
 * Search for similar members using semantic search.
 *
 * Uses pgvector's cosine similarity to find members whose text representations
 * are semantically similar to the query.
 *
 * @param query - Search query text
 * @param tenantId - Tenant ID to scope the search
 * @param limit - Maximum number of results (default 10)
 * @returns Array of similar members with similarity scores
 */
export async function searchSimilar(
  query: string,
  tenantId: string,
  limit = 10,
): Promise<
  Array<{
    socioId: string;
    testoOriginale: string;
    similarita: number;
  }>
> {
  const queryEmbedding = await generateEmbedding(query, tenantId);

  // Use raw SQL for pgvector cosine similarity search
  // The embedding column is added via migration, not defined in Drizzle schema
  const vectorStr = `[${queryEmbedding.join(",")}]`;

  const results = await db.execute(sql`
    SELECT
      socio_id as "socioId",
      testo_originale as "testoOriginale",
      1 - (embedding <=> ${vectorStr}::vector) as "similarita"
    FROM soci_embeddings
    WHERE tenant_id = ${tenantId}
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${vectorStr}::vector
    LIMIT ${limit}
  `);

  return (results.rows ?? []).map((row) => ({
    socioId: String((row as Record<string, unknown>).socioId),
    testoOriginale: String((row as Record<string, unknown>).testoOriginale),
    similarita: Number((row as Record<string, unknown>).similarita),
  }));
}

/**
 * Store an embedding for a member's text representation.
 *
 * @param tenantId - Tenant ID
 * @param socioId - Member ID
 * @param text - Text to generate and store embedding for
 */
export async function storeEmbedding(
  tenantId: string,
  socioId: string,
  text: string,
): Promise<void> {
  const embedding = await generateEmbedding(text, tenantId);
  const vectorStr = `[${embedding.join(",")}]`;

  // Upsert: delete existing embeddings for this socio, then insert new one
  await db
    .delete(sociEmbeddings)
    .where(
      and(
        eq(sociEmbeddings.tenantId, tenantId),
        eq(sociEmbeddings.socioId, socioId),
      ),
    );

  // Insert with raw SQL for the vector column
  await db.execute(sql`
    INSERT INTO soci_embeddings (tenant_id, socio_id, testo_originale, embedding)
    VALUES (${tenantId}, ${socioId}, ${text}, ${vectorStr}::vector)
  `);
}
