import { toast } from "sonner";

import { fireWebhook } from "./api";
import type { TokenUsage, WebhookPayload } from "./types";

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
      form_output: params.formOutput,
      questions: params.questions,
    },
  };
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
