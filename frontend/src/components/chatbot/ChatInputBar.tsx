"use client";

import { useState, useCallback, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { Send, Mic, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface ChatInputBarHandle {
  focus: () => void;
}

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
  audioDevices?: MediaDeviceInfo[];
  selectedDeviceId?: string;
  onDeviceChange?: (deviceId: string) => void;
  /** Draft text to restore when remounting */
  draft?: string;
  /** Called when draft text changes so parent can persist it */
  onDraftChange?: (value: string) => void;
}

export const ChatInputBar = forwardRef<ChatInputBarHandle, ChatInputBarProps>(function ChatInputBar({
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
  audioDevices,
  selectedDeviceId,
  onDeviceChange,
  draft,
  onDraftChange,
}, ref) {
  const [input, setInput] = useState(draft || "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
  }));

  // Append finalized voice text to the input field (not replace)
  useEffect(() => {
    if (voiceText) {
      setInput(prev => {
        const base = prev.trimEnd();
        const next = base ? base + " " + voiceText : voiceText;
        onDraftChange?.(next);
        return next;
      });
      onClearVoiceText?.();
    }
  }, [voiceText, onClearVoiceText, onDraftChange]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || disabled) return;
    // Stop voice if active before sending
    if (isVoiceActive) {
      onVoiceToggle?.();
    }
    onSend(text);
    setInput("");
    onDraftChange?.("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input, disabled, isVoiceActive, onVoiceToggle, onSend, onDraftChange]);

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
  const hasDevices = audioDevices && audioDevices.length > 1;

  return (
    <div className="flex items-end gap-2 border-t border-border p-3">
      <textarea
        ref={textareaRef}
        value={displayValue}
        onChange={(e) => {
          // When voice is active and there's a partial, only allow editing the committed portion
          if (isVoiceActive && partialTranscript) return;
          setInput(e.target.value);
          onDraftChange?.(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        placeholder={isVoiceActive ? "Listening..." : (placeholder ?? "Type a message...")}
        readOnly={isVoiceActive && !!partialTranscript}
        rows={1}
        className={cn(
          "flex-1 resize-none rounded-lg border border-border bg-card-elevated px-3 py-2 text-base text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50",
          isVoiceActive && !input && "italic text-foreground-muted"
        )}
      />
      {onVoiceToggle && (
        <div className="flex shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isVoiceActive ? "default" : "ghost"}
                  size="icon"
                  onClick={onVoiceToggle}
                  disabled={voiceDisabled && !isVoiceActive}
                  className={cn(
                    "h-9 w-9",
                    isVoiceActive && "bg-red-500 hover:bg-red-600 animate-pulse",
                    hasDevices && "rounded-r-none"
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
          {hasDevices && onDeviceChange && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={voiceDisabled && !isVoiceActive}
                  className="h-9 w-5 rounded-l-none border-l border-border/50 px-0"
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-64">
                <DropdownMenuLabel>Microphone</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={selectedDeviceId}
                  onValueChange={onDeviceChange}
                >
                  {audioDevices.map((device) => (
                    <DropdownMenuRadioItem
                      key={device.deviceId}
                      value={device.deviceId}
                      className="text-xs"
                    >
                      <span className="truncate">
                        {device.label || `Microphone (${device.deviceId.slice(0, 8)}...)`}
                      </span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
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
});
