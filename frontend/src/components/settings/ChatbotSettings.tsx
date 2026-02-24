"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface ChatbotSettingsProps {
  chatbotEnabled: boolean;
  onChatbotEnabledChange: (enabled: boolean) => void;
  chatbotQAEnabled: boolean;
  onChatbotQAEnabledChange: (enabled: boolean) => void;
  chatbotTranscriptEnabled: boolean;
  onChatbotTranscriptEnabledChange: (enabled: boolean) => void;
  chatbotActionsEnabled: boolean;
  onChatbotActionsEnabledChange: (enabled: boolean) => void;
}

export function ChatbotSettings({
  chatbotEnabled,
  onChatbotEnabledChange,
  chatbotQAEnabled,
  onChatbotQAEnabledChange,
  chatbotTranscriptEnabled,
  onChatbotTranscriptEnabledChange,
  chatbotActionsEnabled,
  onChatbotActionsEnabledChange,
}: ChatbotSettingsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <Label htmlFor="chatbot-enabled" className="text-sm">
            AI Chatbot
          </Label>
          <p className="text-xs text-foreground-muted">
            Floating assistant for Q&amp;A, transcript questions, and app control.
          </p>
        </div>
        <Switch
          id="chatbot-enabled"
          checked={chatbotEnabled}
          onCheckedChange={onChatbotEnabledChange}
        />
      </div>

      {chatbotEnabled && (
        <div className="ml-1 space-y-3 border-l-2 border-border pl-3">
          <p className="text-xs font-medium text-foreground-secondary">Capabilities</p>

          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <Label htmlFor="chatbot-qa" className="text-sm">
                App Usage Q&amp;A
              </Label>
              <p className="text-xs text-foreground-muted">
                Answer questions using the built-in usage guide.
              </p>
            </div>
            <Switch
              id="chatbot-qa"
              checked={chatbotQAEnabled}
              onCheckedChange={onChatbotQAEnabledChange}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <Label htmlFor="chatbot-transcript" className="text-sm">
                Transcript Context
              </Label>
              <p className="text-xs text-foreground-muted">
                Use the current transcript to answer questions.
              </p>
            </div>
            <Switch
              id="chatbot-transcript"
              checked={chatbotTranscriptEnabled}
              onCheckedChange={onChatbotTranscriptEnabledChange}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <Label htmlFor="chatbot-actions" className="text-sm">
                App Control
              </Label>
              <p className="text-xs text-foreground-muted">
                Let the assistant change settings and perform actions on your behalf.
              </p>
            </div>
            <Switch
              id="chatbot-actions"
              checked={chatbotActionsEnabled}
              onCheckedChange={onChatbotActionsEnabledChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}
