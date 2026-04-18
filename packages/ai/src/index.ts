// Client
export { getAIClient, type AIClient, type ModelTier } from "./client";

// OCR
export { processCertificato, type CertificatoOcrResult } from "./ocr";

// Assistant
export {
	handleAssistantMessage,
	assistantTools,
	type AssistantContext,
	type AssistantResponse,
} from "./assistant";

// Churn Prediction
export {
	predictChurn,
	extractFeatures,
	type SocioFeatures,
	type ChurnPrediction,
} from "./churn";

// Embeddings
export {
	generateEmbedding,
	searchSimilar,
	storeEmbedding,
} from "./embeddings";
