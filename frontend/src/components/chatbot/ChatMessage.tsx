"use client";

import { useState, useCallback, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ActionConfirmCard } from "./ActionConfirmCard";
import type { ChatMessageType } from "@/lib/types";

interface ChatMessageProps {
  message: ChatMessageType;
  isLastAssistant: boolean;
  isStreaming: boolean;
  onConfirmAction?: (messageId: string) => void;
  onCancelAction?: (messageId: string) => void;
}

/** Render markdown only when the content is finalized (not actively streaming). */
const MarkdownContent = memo(function MarkdownContent({ content }: { content: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>;
});

export const ChatMessage = memo(function ChatMessage({ message, isLastAssistant, isStreaming, onConfirmAction, onCancelAction }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isError = message.isError;
  const [copied, setCopied] = useState(false);
  const isActivelyStreaming = isLastAssistant && isStreaming;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message.content]);

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      {isUser || isError ? (
        <div
          className={cn(
            "max-w-[85%] px-3 py-2 text-sm",
            isUser
              ? "rounded-2xl rounded-br-sm bg-primary/10 text-foreground"
              : "rounded-2xl rounded-bl-sm bg-destructive/10 border border-destructive/20 text-destructive",
          )}
        >
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
          {message.action && (
            <ActionConfirmCard
              action={message.action}
              status={message.actionStatus ?? "pending"}
              onConfirm={() => onConfirmAction?.(message.id)}
              onCancel={() => onCancelAction?.(message.id)}
            />
          )}
        </div>
      ) : (
        <div className="group relative max-w-[85%]">
          <div
            className="px-3 py-2 text-sm rounded-2xl rounded-bl-sm bg-muted text-foreground"
          >
            {isActivelyStreaming ? (
              <div key="streaming" data-streaming-target className="markdown-prose break-words streaming-active" />
            ) : (
              <div key="content" className="markdown-prose break-words">
                <MarkdownContent content={message.content} />
              </div>
            )}
            {message.action && (
              <ActionConfirmCard
                action={message.action}
                status={message.actionStatus ?? "pending"}
                onConfirm={() => onConfirmAction?.(message.id)}
                onCancel={() => onCancelAction?.(message.id)}
              />
            )}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-md bg-card-elevated border border-border p-1 hover:bg-muted"
            title="Copy message"
          >
            {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-foreground-muted" />}
          </button>
        </div>
      )}
    </div>
  );
});
