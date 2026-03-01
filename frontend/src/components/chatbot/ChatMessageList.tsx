"use client";

import { useLayoutEffect, useRef, useCallback } from "react";
import { ChatMessage } from "./ChatMessage";
import type { ChatMessageType, ChatbotCopyFormat } from "@/lib/types";

interface ChatMessageListProps {
  messages: ChatMessageType[];
  isStreaming: boolean;
  onConfirmAction?: (messageId: string) => void;
  onCancelAction?: (messageId: string) => void;
  chatbotCopyFormat?: ChatbotCopyFormat;
}

export function ChatMessageList({ messages, isStreaming, onConfirmAction, onCancelAction, chatbotCopyFormat }: ChatMessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isUserScrolledUp = useRef(false);

  // Track if user has scrolled away from the bottom
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isUserScrolledUp.current = distFromBottom > 60;
  }, []);

  // Auto-scroll: useLayoutEffect runs before browser paint, preventing flicker
  useLayoutEffect(() => {
    if (isUserScrolledUp.current) return;
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const lastAssistantIdx = messages.reduceRight(
    (found, msg, i) => (found === -1 && msg.role === "assistant" ? i : found),
    -1,
  );

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-sm text-foreground-muted text-center">
          Ask me anything about the app or your transcript.
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} data-chat-scroll className="flex-1 min-h-0 overflow-y-auto" onScroll={handleScroll}>
      <div className="space-y-3 p-4">
        {messages.map((msg, i) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            isLastAssistant={i === lastAssistantIdx}
            isStreaming={isStreaming}
            onConfirmAction={onConfirmAction}
            onCancelAction={onCancelAction}
            copyFormat={chatbotCopyFormat}
          />
        ))}
        {isStreaming && messages[messages.length - 1]?.role === "assistant" && messages[messages.length - 1]?.content === "" && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2">
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-foreground-muted animate-bounce [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-foreground-muted animate-bounce [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-foreground-muted animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        {/* Spacer at bottom */}
        <div className="h-px" />
      </div>
    </div>
  );
}
