// === Enums ===

export type LLMProvider = "openai" | "anthropic" | "gemini" | "azure_openai" | "langdock";

// === Config types (from GET /getConfig) ===

export interface ProviderInfo {
  id: LLMProvider;
  name: string;
  models: string[];
  requires_azure_config: boolean;
}

export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
}

export interface LanguageOption {
  code: string;
  name: string;
}

export interface ConfigResponse {
  providers: ProviderInfo[];
  prompt_templates: PromptTemplate[];
  languages: LanguageOption[];
}

// === Transcript types ===

export interface CreateTranscriptResponse {
  transcript: string;
}

// === Summary types ===

export interface AzureConfig {
  api_version: string;
  azure_endpoint: string;
  deployment_name: string;
}

export interface LangdockConfig {
  region: "eu" | "us";
}

export interface CreateSummaryRequest {
  provider: LLMProvider;
  api_key: string;
  model: string;
  azure_config: AzureConfig | null;
  langdock_config?: LangdockConfig;
  stream: boolean;
  system_prompt: string;
  text: string;
  target_language: string;
  informal_german: boolean;
  date: string | null;
  author: string | null;
}

export interface CreateSummaryResponse {
  summary: string;
}

// === Key Points types ===

export interface ExtractKeyPointsRequest {
  provider: LLMProvider;
  api_key: string;
  model: string;
  azure_config: AzureConfig | null;
  langdock_config?: LangdockConfig;
  transcript: string;
  speakers: string[];
}

export interface ExtractKeyPointsResponse {
  key_points: Record<string, string>;
}

// === Speaker types ===

export interface GetSpeakersResponse {
  speakers: string[];
}

export interface UpdateSpeakersRequest {
  transcript: string;
  speakers: Record<string, string>;
}

export interface UpdatedTranscriptResponse {
  transcript: string;
}

// === Prompt Assistant types ===

export type QuestionType = "single_select" | "multi_select" | "free_text";

export interface AssistantQuestion {
  id: string;
  question: string;
  type: QuestionType;
  options?: string[];
  default?: string | string[];
  placeholder?: string;
  inferred?: boolean;
  inferred_reason?: string;
}

export interface PromptAssistantAnalyzeRequest {
  provider: LLMProvider;
  api_key: string;
  model: string;
  azure_config: AzureConfig | null;
  langdock_config?: LangdockConfig;
  base_prompt?: string;
}

export interface PromptAssistantAnalyzeResponse {
  questions: AssistantQuestion[];
}

export interface PromptAssistantGenerateRequest {
  provider: LLMProvider;
  api_key: string;
  model: string;
  azure_config: AzureConfig | null;
  langdock_config?: LangdockConfig;
  base_prompt?: string;
  answers: Record<string, string | string[]>;
  additional_notes?: string;
}

export interface PromptAssistantGenerateResponse {
  generated_prompt: string;
}

// === Feature Model Override types ===

export type LLMFeature =
  | "summary_generation"
  | "realtime_summary"
  | "key_point_extraction"
  | "prompt_assistant"
  | "live_question_evaluation";

export const LLM_FEATURE_LABELS: Record<LLMFeature, string> = {
  summary_generation: "Summary Generation",
  realtime_summary: "Realtime Summary",
  key_point_extraction: "Key Point Extraction",
  prompt_assistant: "Prompt Assistant",
  live_question_evaluation: "Live Question Evaluation",
};

export interface FeatureModelOverride {
  provider: LLMProvider;
  model: string;
}

// === Realtime types ===

export type RealtimeConnectionStatus = "disconnected" | "connecting" | "connected" | "reconnecting" | "error";

export type SummaryInterval = 1 | 2 | 3 | 5 | 10;

export type RealtimeWsMessage =
  | { type: "session_started"; session_id: string }
  | { type: "turn"; transcript: string; is_final: boolean }
  | { type: "error"; message: string }
  | { type: "reconnecting"; attempt: number }
  | { type: "session_ended" };

export interface IncrementalSummaryRequest {
  provider: LLMProvider;
  api_key: string;
  model: string;
  azure_config?: AzureConfig;
  langdock_config?: LangdockConfig;
  system_prompt: string;
  full_transcript: string;
  previous_summary?: string;
  new_transcript_chunk?: string;
  is_full_recompute: boolean;
  target_language: string;
  informal_german: boolean;
  date?: string;
  author?: string;
}

export interface IncrementalSummaryResponse {
  summary: string;
  updated_at: string;
}

// === Live Questions types ===

export interface LiveQuestion {
  id: string;
  question: string;
  status: "unanswered" | "answered";
  answer?: string;
  answeredAtTranscriptLength?: number;
  createdAt: number;
}

export interface EvaluateQuestionsRequest {
  provider: LLMProvider;
  api_key: string;
  model: string;
  azure_config?: AzureConfig;
  langdock_config?: LangdockConfig;
  transcript: string;
  questions: { id: string; question: string }[];
}

export interface QuestionEvaluation {
  id: string;
  answered: boolean;
  answer?: string;
}

export interface EvaluateQuestionsResponse {
  evaluations: QuestionEvaluation[];
}
