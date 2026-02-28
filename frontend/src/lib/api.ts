import type {
  ChatRequest,
  ConfigResponse,
  CreateSummaryRequest,
  CreateSummaryResponse,
  CreateTranscriptResponse,
  EvaluateQuestionsRequest,
  EvaluateQuestionsResponse,
  ExtractKeyPointsRequest,
  ExtractKeyPointsResponse,
  FillFormRequest,
  FillFormResponse,
  GenerateTemplateRequest,
  GenerateTemplateResponse,
  GetSpeakersResponse,
  IncrementalSummaryRequest,
  IncrementalSummaryResponse,
  PreferencesResponse,
  PromptAssistantAnalyzeRequest,
  PromptAssistantAnalyzeResponse,
  PromptAssistantGenerateRequest,
  PromptAssistantGenerateResponse,
  TokenUsage,
  UpdatedTranscriptResponse,
  UserPreferences,
  UserProfile,
} from "./types";

const API_BASE = "/api/proxy";
const STREAM_ERROR_RE = /\n?\n?<!--STREAM_ERROR:(.+?)-->$/;
const TOKEN_USAGE_RE = /\n?\n?<!--TOKEN_USAGE:(.+?)-->$/;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = await response.json();
      if (body.detail) {
        message = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
      }
    } catch {
      // body wasn't JSON, use default message
    }
    throw new ApiError(response.status, message);
  }
  return response.json();
}

export async function getConfig(): Promise<ConfigResponse> {
  const response = await fetch(`${API_BASE}/getConfig`);
  return handleResponse<ConfigResponse>(response);
}

export async function createTranscript(
  file: File,
  apiKey: string,
  langCode?: string,
  minSpeaker?: number,
  maxSpeaker?: number,
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  if (langCode) formData.append("lang_code", langCode);
  if (minSpeaker !== undefined) formData.append("min_speaker", String(minSpeaker));
  if (maxSpeaker !== undefined) formData.append("max_speaker", String(maxSpeaker));

  const response = await fetch(`${API_BASE}/createTranscript`, {
    method: "POST",
    headers: { "X-AssemblyAI-Key": apiKey },
    body: formData,
  });

  const data = await handleResponse<CreateTranscriptResponse>(response);
  return data.transcript;
}

export async function getSpeakers(transcript: string): Promise<string[]> {
  const response = await fetch(`${API_BASE}/getSpeakers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript }),
  });
  const data = await handleResponse<GetSpeakersResponse>(response);
  return data.speakers;
}

export async function updateSpeakers(
  transcript: string,
  speakers: Record<string, string>,
): Promise<string> {
  const response = await fetch(`${API_BASE}/updateSpeakers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript, speakers }),
  });
  const data = await handleResponse<UpdatedTranscriptResponse>(response);
  return data.transcript;
}

export async function extractKeyPoints(
  request: ExtractKeyPointsRequest,
): Promise<ExtractKeyPointsResponse> {
  const response = await fetch(`${API_BASE}/extractKeyPoints`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return handleResponse<ExtractKeyPointsResponse>(response);
}

export async function createSummary(
  request: CreateSummaryRequest,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<{ text: string; usage?: TokenUsage }> {
  const sanitized = {
    ...request,
    date: request.date || null,
  };

  const response = await fetch(`${API_BASE}/createSummary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sanitized),
    signal,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = await response.json();
      if (body.detail) {
        message = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
      }
    } catch {
      // body wasn't JSON
    }
    throw new ApiError(response.status, message);
  }

  if (request.stream) {
    const reader = response.body?.getReader();
    if (!reader) throw new ApiError(0, "No response body for streaming");

    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
      onChunk(chunk);
    }

    // Extract usage marker before checking for errors
    let usage: TokenUsage | undefined;
    const usageMatch = fullText.match(TOKEN_USAGE_RE);
    if (usageMatch) {
      try {
        usage = JSON.parse(usageMatch[1]) as TokenUsage;
      } catch { /* ignore parse errors */ }
      fullText = fullText.replace(TOKEN_USAGE_RE, "");
    }

    // Check for backend stream error marker
    const errorMatch = fullText.match(STREAM_ERROR_RE);
    if (errorMatch) {
      throw new ApiError(502, errorMatch[1]);
    }

    return { text: fullText, usage };
  }

  const data = (await response.json()) as CreateSummaryResponse;
  return { text: data.summary, usage: data.usage };
}

export async function createIncrementalSummary(
  request: IncrementalSummaryRequest,
): Promise<IncrementalSummaryResponse> {
  const response = await fetch(`${API_BASE}/createIncrementalSummary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return handleResponse<IncrementalSummaryResponse>(response);
}

export async function analyzePrompt(
  request: PromptAssistantAnalyzeRequest,
): Promise<PromptAssistantAnalyzeResponse> {
  const response = await fetch(`${API_BASE}/prompt-assistant/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return handleResponse<PromptAssistantAnalyzeResponse>(response);
}

export async function generatePrompt(
  request: PromptAssistantGenerateRequest,
): Promise<PromptAssistantGenerateResponse> {
  const response = await fetch(`${API_BASE}/prompt-assistant/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return handleResponse<PromptAssistantGenerateResponse>(response);
}

export async function fillForm(
  request: FillFormRequest,
): Promise<FillFormResponse> {
  const response = await fetch(`${API_BASE}/form-output/fill`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return handleResponse<FillFormResponse>(response);
}

export async function generateTemplate(
  request: GenerateTemplateRequest,
): Promise<GenerateTemplateResponse> {
  const response = await fetch(`${API_BASE}/form-output/generate-template`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return handleResponse<GenerateTemplateResponse>(response);
}

export async function evaluateLiveQuestions(
  request: EvaluateQuestionsRequest,
): Promise<EvaluateQuestionsResponse> {
  const response = await fetch(`${API_BASE}/live-questions/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return handleResponse<EvaluateQuestionsResponse>(response);
}

export async function getMe(): Promise<UserProfile> {
  const response = await fetch(`${API_BASE}/users/me`);
  return handleResponse<UserProfile>(response);
}

export async function getUsers(): Promise<UserProfile[]> {
  const response = await fetch(`${API_BASE}/users`);
  return handleResponse<UserProfile[]>(response);
}

export async function createUser(email: string, name?: string): Promise<UserProfile> {
  const response = await fetch(`${API_BASE}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name }),
  });
  return handleResponse<UserProfile>(response);
}

export async function deleteUser(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/users/${id}`, {
    method: "DELETE",
  });
  if (!response.ok && response.status !== 204) {
    await handleResponse<void>(response);
  }
}

export async function getPreferences(): Promise<PreferencesResponse> {
  const response = await fetch(`${API_BASE}/users/me/preferences`);
  return handleResponse<PreferencesResponse>(response);
}

export async function putPreferences(prefs: UserPreferences): Promise<PreferencesResponse> {
  const response = await fetch(`${API_BASE}/users/me/preferences`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(prefs),
  });
  return handleResponse<PreferencesResponse>(response);
}

export async function deletePreferences(): Promise<void> {
  const response = await fetch(`${API_BASE}/users/me/preferences`, {
    method: "DELETE",
  });
  if (!response.ok && response.status !== 204) {
    await handleResponse<void>(response);
  }
}

export async function chatbotChat(
  request: ChatRequest,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<{ text: string; usage?: TokenUsage }> {
  const response = await fetch(`${API_BASE}/chatbot/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = await response.json();
      if (body.detail) {
        message = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
      }
    } catch {
      // body wasn't JSON
    }
    throw new ApiError(response.status, message);
  }

  if (request.stream) {
    const reader = response.body?.getReader();
    if (!reader) throw new ApiError(0, "No response body for streaming");

    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
      onChunk(chunk);
    }

    // Extract usage marker before checking for errors
    let usage: TokenUsage | undefined;
    const usageMatch = fullText.match(TOKEN_USAGE_RE);
    if (usageMatch) {
      try {
        usage = JSON.parse(usageMatch[1]) as TokenUsage;
      } catch { /* ignore parse errors */ }
      fullText = fullText.replace(TOKEN_USAGE_RE, "");
    }

    // Check for backend stream error marker
    const errorMatch = fullText.match(STREAM_ERROR_RE);
    if (errorMatch) {
      throw new ApiError(502, errorMatch[1]);
    }

    return { text: fullText, usage };
  }

  const data = await response.json();
  return { text: data.content, usage: data.usage };
}
