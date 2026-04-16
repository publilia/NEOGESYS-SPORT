import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { createVault } from "@neogesys/vault";
import { db } from "@neogesys/db";
import { eq } from "drizzle-orm";
import { tenants } from "@neogesys/db/schema";

/**
 * Model tier determines which model to use and rate limits.
 */
export type ModelTier = "fast" | "standard" | "advanced";

/**
 * Tenant plan determines monthly AI usage limits.
 */
type PlanType = "free" | "base" | "pro" | "enterprise";

const PLAN_LIMITS: Record<PlanType, number> = {
  free: 50,
  base: 500,
  pro: 5000,
  enterprise: Number.MAX_SAFE_INTEGER, // unlimited
};

const TIER_MODELS = {
  fast: {
    anthropic: "claude-sonnet-4-20250514",
    openai: "gpt-4o-mini",
  },
  standard: {
    anthropic: "claude-sonnet-4-20250514",
    openai: "gpt-4o",
  },
  advanced: {
    anthropic: "claude-opus-4-20250514",
    openai: "gpt-4o",
  },
} as const;

export interface AIClient {
  provider: "anthropic" | "openai";
  anthropic?: Anthropic;
  openai?: OpenAI;
  model: string;
  tenantId: string;
}

/**
 * Simple in-memory usage tracker.
 * In production this would be backed by Redis or the database.
 */
const usageTracker = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(tenantId: string, plan: PlanType): void {
  const now = Date.now();
  const monthMs = 30 * 24 * 60 * 60 * 1000;

  let usage = usageTracker.get(tenantId);

  if (!usage || now > usage.resetAt) {
    usage = { count: 0, resetAt: now + monthMs };
    usageTracker.set(tenantId, usage);
  }

  const limit = PLAN_LIMITS[plan];

  if (usage.count >= limit) {
    throw new Error(
      `Limite AI raggiunto per il piano ${plan}: ${limit} richieste/mese. ` +
        "Effettua l'upgrade del piano per continuare.",
    );
  }

  usage.count++;
}

/**
 * Get an AI client configured for a specific tenant and model tier.
 *
 * 1. Checks tenant vault for override API keys (tenant-provided keys).
 * 2. Falls back to platform pool keys from environment variables.
 * 3. Enforces rate limits based on the tenant's plan.
 */
export async function getAIClient(
  tenantId: string,
  modelTier: ModelTier = "standard",
): Promise<AIClient> {
  const vault = createVault();

  // Get tenant plan for rate limiting
  const [tenant] = await db
    .select({ piano: tenants.piano })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const plan = (tenant?.piano ?? "free") as PlanType;

  // Check rate limit before proceeding
  checkRateLimit(tenantId, plan);

  // Check if tenant has their own API keys
  const anthropicCreds = await vault.getCredentials(tenantId, "anthropic");
  const openaiCreds = await vault.getCredentials(tenantId, "openai");

  // Prefer tenant's own Anthropic key
  if (anthropicCreds?.apiKey) {
    return {
      provider: "anthropic",
      anthropic: new Anthropic({ apiKey: anthropicCreds.apiKey }),
      model: TIER_MODELS[modelTier].anthropic,
      tenantId,
    };
  }

  // Prefer tenant's own OpenAI key
  if (openaiCreds?.apiKey) {
    return {
      provider: "openai",
      openai: new OpenAI({ apiKey: openaiCreds.apiKey }),
      model: TIER_MODELS[modelTier].openai,
      tenantId,
    };
  }

  // Fall back to platform pool keys
  const platformAnthropicKey = process.env.ANTHROPIC_API_KEY;
  const platformOpenAIKey = process.env.OPENAI_API_KEY;

  if (platformAnthropicKey) {
    return {
      provider: "anthropic",
      anthropic: new Anthropic({ apiKey: platformAnthropicKey }),
      model: TIER_MODELS[modelTier].anthropic,
      tenantId,
    };
  }

  if (platformOpenAIKey) {
    return {
      provider: "openai",
      openai: new OpenAI({ apiKey: platformOpenAIKey }),
      model: TIER_MODELS[modelTier].openai,
      tenantId,
    };
  }

  throw new Error(
    "Nessuna chiave API AI configurata. " +
      "Configura ANTHROPIC_API_KEY o OPENAI_API_KEY nell'ambiente, " +
      "oppure aggiungi le chiavi nelle impostazioni del tenant.",
  );
}
