"use client";

import { X, Trash2, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChatMessageList } from "./ChatMessageList";
import { ChatInputBar } from "./ChatInputBar";
import { TranscriptBadge } from "./TranscriptBadge";
import type { ChatMessageType } from "@/lib/types";

interface ChatbotModalProps {
  open: boolean;
  onClose: () => void;
  onMinimize: () => void;
  messages: ChatMessageType[];
  isStreaming: boolean;
  hasApiKey: boolean;
  onSendMessage: (text: string) => void;
  onClearMessages: () => void;
  onOpenSettings: () => void;
  transcriptAttached: boolean;
  transcriptWordCount: number;
  isLiveTranscript?: boolean;
  onDetachTranscript: () => void;
  onConfirmAction: (messageId: string) => void;
  onCancelAction: (messageId: string) => void;
  isVoiceActive?: boolean;
  partialTranscript?: string;
  voiceText?: string;
  onClearVoiceText?: () => void;
  onVoiceToggle?: () => void;
  voiceDisabled?: boolean;
  voiceDisabledReason?: string;
  isSettingsOpen?: boolean;
}

export function ChatbotModal({
  open,
  onClose,
  onMinimize,
  messages,
  isStreaming,
  hasApiKey,
  onSendMessage,
  onClearMessages,
  onOpenSettings,
  transcriptAttached,
  transcriptWordCount,
  isLiveTranscript,
  onDetachTranscript,
  onConfirmAction,
  onCancelAction,
  isVoiceActive,
  partialTranscript,
  voiceText,
  onClearVoiceText,
  onVoiceToggle,
  voiceDisabled,
  voiceDisabledReason,
  isSettingsOpen,
}: ChatbotModalProps) {
  if (!open) return null;

  return (
    <div className={cn(
      "fixed bottom-20 z-[41] flex w-[420px] max-h-[600px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200 transition-[right] ease-in-out",
      isSettingsOpen ? "right-[404px]" : "right-6",
      "max-md:bottom-0 max-md:right-0 max-md:left-0 max-md:w-full max-md:max-h-[80vh] max-md:rounded-t-xl max-md:rounded-b-none"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">AI Assistant</h3>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClearMessages}
              title="Clear chat"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onMinimize}
            title="Minimize"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
            title="Close"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      {!hasApiKey ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-2">
            <p className="text-sm text-foreground-muted">
              Please configure an API key in Settings to use the chatbot.
            </p>
            <Button variant="outline" size="sm" onClick={onOpenSettings}>
              Open Settings
            </Button>
          </div>
        </div>
      ) : (
        <>
          <ChatMessageList
            messages={messages}
            isStreaming={isStreaming}
            onConfirmAction={onConfirmAction}
            onCancelAction={onCancelAction}
          />
          {transcriptAttached && (
            <TranscriptBadge
              wordCount={transcriptWordCount}
              isLive={isLiveTranscript}
              onDetach={onDetachTranscript}
            />
          )}
          <ChatInputBar
            onSend={onSendMessage}
            disabled={isStreaming}
            isVoiceActive={isVoiceActive}
            onVoiceToggle={onVoiceToggle}
            voiceDisabled={voiceDisabled}
            voiceDisabledReason={voiceDisabledReason}
            partialTranscript={partialTranscript}
            voiceText={voiceText}
            onClearVoiceText={onClearVoiceText}
          />
        </>
      )}
    </div>
  );
}
