"use client";

import { useEffect, useState, useCallback } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RealtimeControls } from "./RealtimeControls";
import { RealtimeTranscriptView } from "./RealtimeTranscriptView";
import { RealtimeSummaryView } from "./RealtimeSummaryView";
import { useRealtimeSession } from "@/hooks/useRealtimeSession";
import type {
  AzureConfig,
  ConfigResponse,
  LLMProvider,
  PromptTemplate,
} from "@/lib/types";

interface RealtimeModeProps {
  config: ConfigResponse | null;
  selectedProvider: LLMProvider;
  selectedModel: string;
  azureConfig: AzureConfig | null;
  selectedPrompt: PromptTemplate | null;
  selectedLanguage: string;
  informalGerman: boolean;
  meetingDate: string;
  authorSpeaker: string;
  getKey: (provider: LLMProvider | "assemblyai") => string;
  hasKey: (provider: LLMProvider | "assemblyai") => boolean;
  onOpenSettings: () => void;
}

export function RealtimeMode({
  selectedProvider,
  selectedModel,
  azureConfig,
  selectedPrompt,
  selectedLanguage,
  informalGerman,
  meetingDate,
  authorSpeaker,
  getKey,
  hasKey,
  onOpenSettings,
}: RealtimeModeProps) {
  const session = useRealtimeSession();
  const [mobileTab, setMobileTab] = useState<"transcript" | "summary">("transcript");
  const [micDeviceId, setMicDeviceId] = useState<string | undefined>(undefined);

  const isActive = session.connectionStatus === "connected" || session.connectionStatus === "reconnecting";

  // Keep LLM config in sync with settings
  useEffect(() => {
    if (!selectedPrompt) return;
    session.setLlmConfig({
      provider: selectedProvider,
      apiKey: getKey(selectedProvider),
      model: selectedModel,
      azureConfig: azureConfig || undefined,
      systemPrompt: selectedPrompt.content,
      targetLanguage: selectedLanguage,
      informalGerman,
      date: meetingDate || undefined,
      author: authorSpeaker || undefined,
    });
  }, [
    selectedProvider,
    selectedModel,
    azureConfig,
    selectedPrompt,
    selectedLanguage,
    informalGerman,
    meetingDate,
    authorSpeaker,
    getKey,
    session.setLlmConfig,
  ]);

  const handleStart = useCallback(() => {
    if (!hasKey("assemblyai")) {
      toast.error("AssemblyAI API key is required for realtime transcription");
      onOpenSettings();
      return;
    }
    if (!hasKey(selectedProvider)) {
      toast.error(`API key for ${selectedProvider} is required for summary generation`);
      onOpenSettings();
      return;
    }
    if (!selectedPrompt) {
      toast.error("Please select a prompt template first");
      return;
    }

    session.startSession(getKey("assemblyai"), micDeviceId);
  }, [hasKey, selectedProvider, selectedPrompt, getKey, micDeviceId, onOpenSettings, session]);

  const handleCopyTranscript = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(session.accumulatedTranscript);
      toast.success("Transcript copied to clipboard", { position: "bottom-center" });
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }, [session.accumulatedTranscript]);

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <RealtimeControls
        connectionStatus={session.connectionStatus}
        isPaused={session.isPaused}
        isSessionEnded={session.isSessionEnded}
        elapsedTime={session.elapsedTime}
        summaryInterval={session.summaryInterval}
        onStart={handleStart}
        onPause={session.pauseSession}
        onResume={session.resumeSession}
        onStop={session.stopSession}
        onIntervalChange={session.setSummaryInterval}
        onMicChange={setMicDeviceId}
      />

      {/* Desktop layout: two columns */}
      <div className="hidden md:grid md:grid-cols-2 md:gap-4">
        <RealtimeTranscriptView
          accumulatedTranscript={session.accumulatedTranscript}
          currentPartial={session.currentPartial}
          isSessionActive={isActive}
        />
        <RealtimeSummaryView
          summary={session.realtimeSummary}
          summaryUpdatedAt={session.summaryUpdatedAt}
          isSummaryUpdating={session.isSummaryUpdating}
          isSessionEnded={session.isSessionEnded}
        />
      </div>

      {/* Mobile layout: tabbed */}
      <div className="md:hidden">
        <div className="flex border-b border-border mb-4">
          <button
            className={`flex-1 pb-2 text-sm font-medium transition-colors ${
              mobileTab === "transcript"
                ? "border-b-2 border-primary text-foreground"
                : "text-foreground-muted hover:text-foreground-secondary"
            }`}
            onClick={() => setMobileTab("transcript")}
          >
            Transcript
          </button>
          <button
            className={`flex-1 pb-2 text-sm font-medium transition-colors ${
              mobileTab === "summary"
                ? "border-b-2 border-primary text-foreground"
                : "text-foreground-muted hover:text-foreground-secondary"
            }`}
            onClick={() => setMobileTab("summary")}
          >
            Summary
          </button>
        </div>

        {mobileTab === "transcript" ? (
          <RealtimeTranscriptView
            accumulatedTranscript={session.accumulatedTranscript}
            currentPartial={session.currentPartial}
            isSessionActive={isActive}
          />
        ) : (
          <RealtimeSummaryView
            summary={session.realtimeSummary}
            summaryUpdatedAt={session.summaryUpdatedAt}
            isSummaryUpdating={session.isSummaryUpdating}
            isSessionEnded={session.isSessionEnded}
          />
        )}
      </div>

      {/* Session ended actions */}
      {session.isSessionEnded && session.accumulatedTranscript && (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={handleCopyTranscript}>
            <Copy className="mr-2 h-4 w-4" />
            Copy Transcript
          </Button>
          <Button onClick={() => session.resetSession()}>
            Start New Session
          </Button>
        </div>
      )}
    </div>
  );
}
