import { toast } from "sonner";

import { fireWebhook, generateTitle } from "./api";
import type { AzureConfig, LangdockConfig, LLMProvider, TokenUsage, WebhookPayload } from "./types";

/**
 * Strip markdown formatting to produce plain text.
 */
export function stripMarkdown(md: string): string {
  return (
    md
      // Remove headings
      .replace(/^#{1,6}\s+/gm, "")
      // Remove bold/italic
      .replace(/(\*{1,3}|_{1,3})(.+?)\1/g, "$2")
      // Remove strikethrough
      .replace(/~~(.+?)~~/g, "$1")
      // Remove inline code
      .replace(/`([^`]+)`/g, "$1")
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, "")
      // Remove images
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
      // Remove links but keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Remove blockquotes
      .replace(/^>\s+/gm, "")
      // Remove horizontal rules
      .replace(/^[-*_]{3,}\s*$/gm, "")
      // Remove list markers
      .replace(/^[\s]*[-*+]\s+/gm, "")
      .replace(/^[\s]*\d+\.\s+/gm, "")
      // Remove HTML tags
      .replace(/<[^>]+>/g, "")
      // Collapse multiple blank lines
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

export interface WebhookPayloadParams {
  transcript: string;
  speakerMapping: Record<string, string>;
  summary: string;
  summaryTitle: string | null;
  mode: "standard" | "realtime";
  contentType: "transcript" | "summary" | "form";
  meetingDate: string | null;
  model: string;
  provider: string;
  prompt: string;
  language: string;
  tokenUsage: TokenUsage | null;
  formOutput: Record<string, unknown> | null;
  questions: { id: string; question: string; status: string; answer?: string }[] | null;
  userArgs: { key: string; value: string }[] | null;
}

/**
 * Build the webhook payload from the available context.
 */
export function buildWebhookPayload(params: WebhookPayloadParams): WebhookPayload {
  const eventMap: Record<string, string> = {
    transcript: "transcript.completed",
    summary: "summary.completed",
    form: "form.completed",
  };

  return {
    event: eventMap[params.contentType] ?? params.contentType,
    mode: params.mode,
    content_type: params.contentType,
    timestamp: new Date().toISOString(),
    data: {
      transcript: params.transcript,
      speaker_mapping: params.speakerMapping,
      summary_plain: params.summary ? stripMarkdown(params.summary) : "",
      summary_markdown: params.summary,
      meeting_date: params.meetingDate,
      model: params.model,
      provider: params.provider,
      prompt: params.prompt,
      language: params.language,
      token_usage: params.tokenUsage,
      summary_title: params.summaryTitle ?? null,
      form_output: params.formOutput,
      questions: params.questions,
      user_args: params.userArgs && params.userArgs.length > 0
        ? Object.fromEntries(params.userArgs.map(({ key, value }) => [key, value]))
        : null,
    },
  };
}

/**
 * Build a test webhook payload that matches the real summary.completed schema.
 * Uses sample data so receivers can validate their integration against the full shape.
 */
export function buildTestWebhookPayload(
  userArgs: { key: string; value: string }[] | null,
): WebhookPayload {
  const sampleSummaryMarkdown =
    "## Sample Meeting Summary\n- This is a test webhook from AIAudioSummary\n- It uses the same schema as a real webhook\n\n## Action Items\n- Verify webhook integration is working correctly";

  const payload = buildWebhookPayload({
    transcript:
      "This is a sample transcript from a test webhook. It demonstrates the full payload schema that your webhook endpoint will receive when a real summary is completed.",
    speakerMapping: {},
    summary: sampleSummaryMarkdown,
    summaryTitle: "Sample Meeting Summary",
    mode: "realtime",
    contentType: "summary",
    meetingDate: new Date().toISOString().split("T")[0],
    model: "test-model",
    provider: "test-provider",
    prompt: "This is a sample system prompt used for testing purposes.",
    language: "English",
    tokenUsage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 },
    formOutput: null,
    questions: null,
    userArgs,
  });

  payload.event = "test.completed";
  payload.mode = "test";

  return payload;
}

/**
 * Fire a webhook via the backend and show a toast notification.
 * Fire-and-forget — callers don't need to await this.
 */
export function fireWebhookWithToast(
  webhookUrl: string,
  webhookSecret: string,
  payload: WebhookPayload,
): void {
  fireWebhook({
    webhook_url: webhookUrl,
    webhook_secret: webhookSecret || undefined,
    payload,
  })
    .then((res) => {
      if (res.success) {
        toast.success("Webhook delivered successfully");
      } else {
        toast.error(`Webhook failed: ${res.error ?? `HTTP ${res.status_code}`}`);
      }
    })
    .catch(() => {
      toast.error("Webhook delivery failed");
    });
}

/**
 * Fire a transcript webhook, optionally generating a title first.
 * When generateTitleEnabled is true, shows "Webhook queued" while generating,
 * then fires the webhook and shows "Webhook delivered successfully".
 */
export function fireTranscriptWebhookWithTitle(
  webhookUrl: string,
  webhookSecret: string,
  payloadParams: WebhookPayloadParams,
  titleConfig: {
    enabled: boolean;
    provider: LLMProvider;
    apiKey: string;
    model: string;
    azureConfig: AzureConfig | null;
    langdockConfig?: LangdockConfig;
    language: string;
    date: string | null;
    systemPrompt?: string;
  },
): void {
  if (!titleConfig.enabled || !titleConfig.apiKey) {
    // No title generation — fire immediately with null title
    fireWebhookWithToast(webhookUrl, webhookSecret, buildWebhookPayload(payloadParams));
    return;
  }

  const toastId = toast.info("Webhook queued — generating title…", { duration: Infinity });

  generateTitle({
    provider: titleConfig.provider,
    api_key: titleConfig.apiKey,
    model: titleConfig.model,
    azure_config: titleConfig.azureConfig,
    langdock_config: titleConfig.langdockConfig,
    transcript: payloadParams.transcript,
    target_language: titleConfig.language,
    date: titleConfig.date,
    system_prompt: titleConfig.systemPrompt,
  })
    .then((titleRes) => {
      toast.dismiss(toastId);
      const payload = buildWebhookPayload({ ...payloadParams, summaryTitle: titleRes.title });
      fireWebhookWithToast(webhookUrl, webhookSecret, payload);
    })
    .catch((err) => {
      toast.dismiss(toastId);
      toast.error(`Title generation failed: ${err instanceof Error ? err.message : "unknown error"} — firing webhook without title`);
      fireWebhookWithToast(webhookUrl, webhookSecret, buildWebhookPayload(payloadParams));
    });
}
