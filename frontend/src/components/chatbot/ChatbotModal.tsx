"use client";

import { useState, useEffect, useRef } from "react";
import { X, Trash2, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChatMessageList } from "./ChatMessageList";
import { ChatInputBar } from "./ChatInputBar";
import type { ChatInputBarHandle } from "./ChatInputBar";
import { TranscriptBadge } from "./TranscriptBadge";
import { TokenUsageBadge } from "@/components/ui/TokenUsageBadge";
import type { ChatMessageType, TokenUsage, ChatbotCopyFormat } from "@/lib/types";

interface ChatbotModalProps {
  open: boolean;
  onClose: () => void;

  messages: ChatMessageType[];
  isStreaming: boolean;
  hasApiKey: boolean;
  onSendMessage: (text: string) => void;
  onClearMessages: () => void;
  onOpenSettings: () => void;
  transcriptAttached: boolean;
  transcriptSuspended?: boolean;
  transcriptWordCount: number;
  isLiveTranscript?: boolean;
  isLiveTranscriptActive?: boolean;
  onDetachTranscript: () => void;
  onReattachTranscript?: () => void;
  onConfirmAction: (messageId: string) => void;
  onCancelAction: (messageId: string) => void;
  isVoiceActive?: boolean;
  partialTranscript?: string;
  voiceText?: string;
  onClearVoiceText?: () => void;
  onVoiceToggle?: () => void;
  voiceDisabled?: boolean;
  voiceDisabledReason?: string;
  audioDevices?: MediaDeviceInfo[];
  selectedDeviceId?: string;
  onDeviceChange?: (deviceId: string) => void;
  isSettingsOpen?: boolean;
  chatDraft?: string;
  onChatDraftChange?: (value: string) => void;
  sessionUsage?: TokenUsage | null;
  lastRequestUsage?: TokenUsage | null;
  contextWindow?: number;
  chatbotCopyFormat?: ChatbotCopyFormat;
}

export function ChatbotModal({
  open,
  onClose,

  messages,
  isStreaming,
  hasApiKey,
  onSendMessage,
  onClearMessages,
  onOpenSettings,
  transcriptAttached,
  transcriptSuspended,
  transcriptWordCount,
  isLiveTranscript,
  isLiveTranscriptActive,
  onDetachTranscript,
  onReattachTranscript,
  onConfirmAction,
  onCancelAction,
  isVoiceActive,
  partialTranscript,
  voiceText,
  onClearVoiceText,
  onVoiceToggle,
  voiceDisabled,
  voiceDisabledReason,
  audioDevices,
  selectedDeviceId,
  onDeviceChange,
  isSettingsOpen,
  chatDraft,
  onChatDraftChange,
  sessionUsage,
  lastRequestUsage,
  contextWindow,
  chatbotCopyFormat,
}: ChatbotModalProps) {
  const inputBarRef = useRef<ChatInputBarHandle>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  // Keyboard shortcut indicators
  const [altPressed, setAltPressed] = useState(false);
  const [cPressed, setCPressed] = useState(false);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Alt") setAltPressed(true);
      if (e.code === "KeyC" && e.altKey) setCPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Alt") setAltPressed(false);
      if (e.code === "KeyC") setCPressed(false);
    };
    const handleBlur = () => {
      setAltPressed(false);
      setCPressed(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [open]);

  // Auto-focus input when chatbot opens
  useEffect(() => {
    if (open) {
      // Small delay to ensure the DOM is rendered
      const timer = setTimeout(() => inputBarRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const kbdBase =
    "flex h-6 min-w-6 items-center justify-center rounded border px-1.5 text-[11px] font-semibold transition-colors";
  const kbdDefault = "border-border bg-card-elevated text-foreground-secondary";
  const kbdActive = "border-foreground/30 bg-foreground/10 text-foreground";

  if (!open) return null;

  return (
    <>
    {/* Backdrop — click outside to restore from maximized */}
    {isMaximized && <div className="fixed inset-0 z-[40]" onClick={() => setIsMaximized(false)} />}
    <div className={cn(
      "fixed z-[41] flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200 transition-[right,left,top,width,max-height,bottom] ease-in-out",
      isMaximized
        ? "top-[88px] bottom-[56px] left-12 right-12 w-auto max-h-none"
        : "bottom-20 w-[420px] max-h-[600px]",
      !isMaximized && (isSettingsOpen ? "right-[404px]" : "right-6"),
      "max-md:bottom-0 max-md:right-0 max-md:left-0 max-md:top-auto max-md:w-full max-md:max-h-[80vh] max-md:rounded-t-xl max-md:rounded-b-none"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">AI Assistant</h3>
          <div className="hidden md:flex items-center gap-1">
            <kbd className={`${kbdBase} ${altPressed ? kbdActive : kbdDefault}`}>
              {typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent) ? (
                <span className="text-xs leading-none">⌥</span>
              ) : (
                "Alt"
              )}
            </kbd>
            <kbd className={`${kbdBase} ${cPressed ? kbdActive : kbdDefault}`}>C</kbd>
          </div>
          <TokenUsageBadge usage={sessionUsage} lastRequestUsage={lastRequestUsage} contextWindow={contextWindow} />
        </div>
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
            className="hidden md:inline-flex h-7 w-7"
            onClick={() => setIsMaximized((v) => !v)}
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
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
            chatbotCopyFormat={chatbotCopyFormat}
          />
          {transcriptAttached && (
            <TranscriptBadge
              wordCount={transcriptWordCount}
              isLive={isLiveTranscript}
              isLiveActive={isLiveTranscriptActive}
              suspended={transcriptSuspended}
              onDetach={onDetachTranscript}
              onReattach={onReattachTranscript}
            />
          )}
          <ChatInputBar
            ref={inputBarRef}
            onSend={onSendMessage}
            disabled={isStreaming}
            isVoiceActive={isVoiceActive}
            onVoiceToggle={onVoiceToggle}
            voiceDisabled={voiceDisabled}
            voiceDisabledReason={voiceDisabledReason}
            partialTranscript={partialTranscript}
            voiceText={voiceText}
            onClearVoiceText={onClearVoiceText}
            audioDevices={audioDevices}
            selectedDeviceId={selectedDeviceId}
            onDeviceChange={onDeviceChange}
            draft={chatDraft}
            onDraftChange={onChatDraftChange}
          />
        </>
      )}
    </div>
    </>
  );
}
