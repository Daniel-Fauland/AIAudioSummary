// === Enums ===

export type LLMProvider = "openai" | "anthropic" | "gemini" | "azure_openai";

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

export interface CreateSummaryRequest {
  provider: LLMProvider;
  api_key: string;
  model: string;
  azure_config: AzureConfig | null;
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
