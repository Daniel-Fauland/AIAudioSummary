"use client";

import { useState, useCallback, useRef, useEffect, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ActionConfirmCard } from "./ActionConfirmCard";
import type { ChatMessageType, ChatbotCopyFormat } from "@/lib/types";

interface ChatMessageProps {
  message: ChatMessageType;
  isLastAssistant: boolean;
  isStreaming: boolean;
  onConfirmAction?: (messageId: string) => void;
  onCancelAction?: (messageId: string) => void;
  copyFormat?: ChatbotCopyFormat;
}

/** Render markdown only when the content is finalized (not actively streaming). */
const MarkdownContent = memo(function MarkdownContent({ content }: { content: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>;
});

export const ChatMessage = memo(function ChatMessage({ message, isLastAssistant, isStreaming, onConfirmAction, onCancelAction, copyFormat = "formatted" }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isError = message.isError;
  const [copied, setCopied] = useState(false);
  const [showBottomCopy, setShowBottomCopy] = useState(false);
  const isActivelyStreaming = isLastAssistant && isStreaming;
  const contentRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);

  // Show a bottom copy button when the top of the message scrolls out of the chat viewport
  useEffect(() => {
    if (isUser || isError) return;
    const sentinel = topSentinelRef.current;
    if (!sentinel) return;

    const scrollContainer = sentinel.closest("[data-chat-scroll]");
    if (!scrollContainer) return;

    const observer = new IntersectionObserver(
      ([entry]) => setShowBottomCopy(!entry.isIntersecting),
      { root: scrollContainer, threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isUser, isError]);

  const handleCopy = useCallback(async () => {
    try {
      if (copyFormat === "plain") {
        // Copy plain text from the rendered DOM (strips markdown formatting)
        const plainText = contentRef.current?.textContent ?? message.content;
        await navigator.clipboard.writeText(plainText);
      } else if (copyFormat === "formatted") {
        // Copy as rich text (HTML) so it pastes formatted in Word, Google Docs, etc.
        const html = contentRef.current?.innerHTML;
        if (html) {
          const plainText = contentRef.current?.textContent ?? message.content;
          await navigator.clipboard.write([
            new ClipboardItem({
              "text/html": new Blob([html], { type: "text/html" }),
              "text/plain": new Blob([plainText], { type: "text/plain" }),
            }),
          ]);
        } else {
          await navigator.clipboard.writeText(message.content);
        }
      } else {
        // "markdown" — copy raw markdown source (default / current behavior)
        await navigator.clipboard.writeText(message.content);
      }
    } catch {
      // Fallback: always try plain text write
      await navigator.clipboard.writeText(message.content);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message.content, copyFormat]);

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
            {/* Sentinel to track when the top of the message scrolls out of view */}
            <div ref={topSentinelRef} className="h-0 w-0 overflow-hidden" />
            {isActivelyStreaming ? (
              <div key="streaming" data-streaming-target className="markdown-prose break-words streaming-active" />
            ) : (
              <div key="content" ref={contentRef} className="markdown-prose break-words">
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
          {/* Bottom copy button — visible when the top copy button scrolls out of view */}
          {showBottomCopy ? (
            <button
              type="button"
              onClick={handleCopy}
              className="absolute -bottom-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-md bg-card-elevated border border-border p-1 hover:bg-muted"
              title="Copy message"
            >
              {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-foreground-muted" />}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
});
