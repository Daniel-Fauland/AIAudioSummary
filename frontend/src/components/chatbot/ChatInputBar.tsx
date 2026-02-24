"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Send, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ChatInputBarProps {
  onSend: (text: string) => void;
  disabled: boolean;
  placeholder?: string;
  isVoiceActive?: boolean;
  onVoiceToggle?: () => void;
  voiceDisabled?: boolean;
  voiceDisabledReason?: string;
  partialTranscript?: string;
  /** Accumulated finalized voice text (user can edit before sending) */
  voiceText?: string;
  /** Called after voice text is consumed (sent or cleared) */
  onClearVoiceText?: () => void;
}

export function ChatInputBar({
  onSend,
  disabled,
  placeholder,
  isVoiceActive,
  onVoiceToggle,
  voiceDisabled,
  voiceDisabledReason,
  partialTranscript,
  voiceText,
  onClearVoiceText,
}: ChatInputBarProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync finalized voice text into the input field
  useEffect(() => {
    if (voiceText) {
      setInput(voiceText);
      onClearVoiceText?.();
    }
  }, [voiceText, onClearVoiceText]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || disabled) return;
    // Stop voice if active before sending
    if (isVoiceActive) {
      onVoiceToggle?.();
    }
    onSend(text);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input, disabled, isVoiceActive, onVoiceToggle, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // Build display value: typed input + in-progress partial (greyed out)
  const displayValue = isVoiceActive && partialTranscript
    ? (input ? input + " " + partialTranscript : partialTranscript)
    : input;

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
  }, [displayValue]);

  const canSend = input.trim().length > 0 && !disabled;

  return (
    <div className="flex items-end gap-2 border-t border-border p-3">
      <textarea
        ref={textareaRef}
        value={displayValue}
        onChange={(e) => {
          // When voice is active and there's a partial, only allow editing the committed portion
          if (isVoiceActive && partialTranscript) return;
          setInput(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        placeholder={isVoiceActive ? "Listening..." : (placeholder ?? "Type a message...")}
        disabled={disabled}
        readOnly={isVoiceActive && !!partialTranscript}
        rows={1}
        className={cn(
          "flex-1 resize-none rounded-lg border border-border bg-card-elevated px-3 py-2 text-base text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50",
          isVoiceActive && !input && "italic text-foreground-muted"
        )}
      />
      {onVoiceToggle && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isVoiceActive ? "default" : "ghost"}
                size="icon"
                onClick={onVoiceToggle}
                disabled={voiceDisabled && !isVoiceActive}
                className={cn(
                  "h-9 w-9 shrink-0",
                  isVoiceActive && "bg-red-500 hover:bg-red-600 animate-pulse"
                )}
              >
                <Mic className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            {voiceDisabled && !isVoiceActive && (
              <TooltipContent>
                <p>{voiceDisabledReason || "Voice input unavailable"}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      )}
      <Button
        size="icon"
        onClick={handleSend}
        disabled={!canSend}
        className="h-9 w-9 shrink-0"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
