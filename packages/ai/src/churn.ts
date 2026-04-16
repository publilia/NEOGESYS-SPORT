import { getAIClient } from "./client";

/**
 * Features used for churn prediction.
 */
export interface SocioFeatures {
  socioId: string;
  tenantId: string;
  // Engagement features
  giorniDallaUltimaPresenza: number;
  presenzeUltimi30Giorni: number;
  presenzeUltimi90Giorni: number;
  tassoPresenzaPercentuale: number; // 0-100
  // Payment features
  quoteInsolute: number;
  giorniDallaUltimaQuotaPagata: number;
  importoTotaleInsoluto: number;
  // Profile features
  mesiDiIscrizione: number;
  haCorsiAttivi: boolean;
  numeroCertificatiValidi: number;
  certificatoInScadenza: boolean;
  // Interaction features
  ultimoAccessoGiorni: number;
  numeroCorsiIscritto: number;
}

/**
 * Result of a churn prediction.
 */
export interface ChurnPrediction {
  socioId: string;
  score: number; // 0-100, higher = more likely to churn
  rischio: "basso" | "medio" | "alto" | "critico";
  ragioni: string[];
  suggerimenti: string[];
}

/**
 * Extract churn features from raw data.
 * Normalizes and prepares features for the prediction model.
 */
export function extractFeatures(data: {
  socioId: string;
  tenantId: string;
  ultimaPresenza: Date | null;
  presenze30g: number;
  presenze90g: number;
  lezionePreviste30g: number;
  quoteInsolute: number;
  ultimaQuotaPagata: Date | null;
  importoInsoluto: number;
  dataIscrizione: Date | null;
  corsiAttivi: number;
  certificatiValidi: number;
  certificatoInScadenza: boolean;
  ultimoAccesso: Date | null;
}): SocioFeatures {
  const now = new Date();

  const daysSince = (date: Date | null): number => {
    if (!date) return 365; // default to high value if never occurred
    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  };

  const monthsSince = (date: Date | null): number => {
    if (!date) return 0;
    return Math.floor(daysSince(date) / 30);
  };

  const tassoPresenza =
    data.lezionePreviste30g > 0
      ? Math.round((data.presenze30g / data.lezionePreviste30g) * 100)
      : 0;

  return {
    socioId: data.socioId,
    tenantId: data.tenantId,
    giorniDallaUltimaPresenza: daysSince(data.ultimaPresenza),
    presenzeUltimi30Giorni: data.presenze30g,
    presenzeUltimi90Giorni: data.presenze90g,
    tassoPresenzaPercentuale: tassoPresenza,
    quoteInsolute: data.quoteInsolute,
    giorniDallaUltimaQuotaPagata: daysSince(data.ultimaQuotaPagata),
    importoTotaleInsoluto: data.importoInsoluto,
    mesiDiIscrizione: monthsSince(data.dataIscrizione),
    haCorsiAttivi: data.corsiAttivi > 0,
    numeroCertificatiValidi: data.certificatiValidi,
    certificatoInScadenza: data.certificatoInScadenza,
    ultimoAccessoGiorni: daysSince(data.ultimoAccesso),
    numeroCorsiIscritto: data.corsiAttivi,
  };
}

/**
 * Calculate a heuristic churn score without AI, used as fallback.
 */
function heuristicChurnScore(features: SocioFeatures): ChurnPrediction {
  let score = 0;
  const ragioni: string[] = [];
  const suggerimenti: string[] = [];

  // Attendance signals (max 35 points)
  if (features.giorniDallaUltimaPresenza > 60) {
    score += 25;
    ragioni.push("Non partecipa da oltre 60 giorni");
    suggerimenti.push("Contattare il socio per verificare la situazione");
  } else if (features.giorniDallaUltimaPresenza > 30) {
    score += 15;
    ragioni.push("Non partecipa da oltre 30 giorni");
  }

  if (features.tassoPresenzaPercentuale < 30 && features.haCorsiAttivi) {
    score += 10;
    ragioni.push("Tasso di presenza molto basso");
    suggerimenti.push("Proporre un cambio di corso o orario");
  }

  // Payment signals (max 30 points)
  if (features.quoteInsolute > 2) {
    score += 20;
    ragioni.push(`${features.quoteInsolute} quote insolute`);
    suggerimenti.push("Inviare sollecito di pagamento");
  } else if (features.quoteInsolute > 0) {
    score += 10;
    ragioni.push("Quote insolute presenti");
  }

  if (features.importoTotaleInsoluto > 200) {
    score += 10;
    ragioni.push("Importo insoluto significativo");
    suggerimenti.push("Proporre un piano di rateizzazione");
  }

  // Certificate signals (max 15 points)
  if (features.certificatoInScadenza) {
    score += 10;
    ragioni.push("Certificato medico in scadenza");
    suggerimenti.push("Inviare promemoria per il rinnovo del certificato");
  }

  if (features.numeroCertificatiValidi === 0) {
    score += 5;
    ragioni.push("Nessun certificato medico valido");
  }

  // Activity signals (max 20 points)
  if (!features.haCorsiAttivi) {
    score += 15;
    ragioni.push("Nessun corso attivo");
    suggerimenti.push("Proporre l'iscrizione a un corso");
  }

  if (features.ultimoAccessoGiorni > 45) {
    score += 5;
    ragioni.push("Nessun accesso recente alla piattaforma");
  }

  // Cap at 100
  score = Math.min(score, 100);

  let rischio: ChurnPrediction["rischio"];
  if (score >= 75) {
    rischio = "critico";
  } else if (score >= 50) {
    rischio = "alto";
  } else if (score >= 25) {
    rischio = "medio";
  } else {
    rischio = "basso";
  }

  if (ragioni.length === 0) {
    ragioni.push("Nessun segnale di abbandono rilevato");
  }
  if (suggerimenti.length === 0) {
    suggerimenti.push("Continuare a monitorare il coinvolgimento");
  }

  return {
    socioId: features.socioId,
    score,
    rischio,
    ragioni,
    suggerimenti,
  };
}

/**
 * Predict churn probability for a member using AI analysis.
 *
 * Falls back to a heuristic model if AI is unavailable.
 *
 * @param features - Computed features for the member
 * @returns Churn prediction with score, risk level, reasons, and suggestions
 */
export async function predictChurn(
  features: SocioFeatures,
): Promise<ChurnPrediction> {
  try {
    const client = await getAIClient(features.tenantId, "fast");

    if (client.provider !== "anthropic" || !client.anthropic) {
      return heuristicChurnScore(features);
    }

    const response = await client.anthropic.messages.create({
      model: client.model,
      max_tokens: 512,
      system: `Sei un analista di churn per associazioni sportive italiane.
Analizza le metriche di un socio e restituisci un JSON con:
- score: numero da 0 a 100 (probabilita di abbandono)
- rischio: "basso" | "medio" | "alto" | "critico"
- ragioni: array di stringhe con i motivi principali
- suggerimenti: array di stringhe con azioni consigliate

Rispondi SOLO con il JSON, senza markdown.`,
      messages: [
        {
          role: "user",
          content: `Analizza il rischio di abbandono per questo socio:

${JSON.stringify(features, null, 2)}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return heuristicChurnScore(features);
    }

    const parsed = JSON.parse(textBlock.text) as {
      score: number;
      rischio: ChurnPrediction["rischio"];
      ragioni: string[];
      suggerimenti: string[];
    };

    return {
      socioId: features.socioId,
      ...parsed,
    };
  } catch {
    // Fallback to heuristic model if AI call fails
    return heuristicChurnScore(features);
  }
}
