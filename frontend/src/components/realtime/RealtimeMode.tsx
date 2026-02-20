"use client";

import { useEffect, useState, useCallback } from "react";
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
  SummaryInterval,
} from "@/lib/types";

interface RealtimeModeProps {
  config: ConfigResponse | null;
  selectedProvider: LLMProvider;
  selectedModel: string;
  azureConfig: AzureConfig | null;
  selectedLanguage: string;
  informalGerman: boolean;
  meetingDate: string;
  authorSpeaker: string;
  getKey: (provider: LLMProvider | "assemblyai") => string;
  hasKey: (provider: LLMProvider | "assemblyai") => boolean;
  onOpenSettings: () => void;
  summaryInterval: SummaryInterval;
  realtimeFinalSummaryEnabled: boolean;
  realtimeSystemPrompt: string;
}

export function RealtimeMode({
  selectedProvider,
  selectedModel,
  azureConfig,
  selectedLanguage,
  informalGerman,
  meetingDate,
  authorSpeaker,
  getKey,
  hasKey,
  onOpenSettings,
  summaryInterval,
  realtimeFinalSummaryEnabled,
  realtimeSystemPrompt,
}: RealtimeModeProps) {
  const session = useRealtimeSession();
  const [mobileTab, setMobileTab] = useState<"transcript" | "summary">("transcript");
  const [micDeviceId, setMicDeviceId] = useState<string | undefined>(undefined);

  const isActive = session.connectionStatus === "connected" || session.connectionStatus === "reconnecting";

  // Keep LLM config in sync with settings
  useEffect(() => {
    session.setLlmConfig({
      provider: selectedProvider,
      apiKey: getKey(selectedProvider),
      model: selectedModel,
      azureConfig: azureConfig || undefined,
      systemPrompt: realtimeSystemPrompt,
      targetLanguage: selectedLanguage,
      informalGerman,
      date: meetingDate || undefined,
      author: authorSpeaker || undefined,
    });
  }, [
    selectedProvider,
    selectedModel,
    azureConfig,
    realtimeSystemPrompt,
    selectedLanguage,
    informalGerman,
    meetingDate,
    authorSpeaker,
    getKey,
    session.setLlmConfig,
  ]);

  useEffect(() => {
    session.setSummaryInterval(summaryInterval);
  }, [summaryInterval, session.setSummaryInterval]);

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

    session.startSession(getKey("assemblyai"), micDeviceId);
  }, [hasKey, selectedProvider, getKey, micDeviceId, onOpenSettings, session]);

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
        summaryCountdown={session.summaryCountdown}
        isSummaryUpdating={session.isSummaryUpdating}
        hasTranscript={!!session.accumulatedTranscript}
        hasSummary={!!session.realtimeSummary}
        onStart={handleStart}
        onPause={session.pauseSession}
        onResume={session.resumeSession}
        onStop={() => session.stopSession(realtimeFinalSummaryEnabled)}
        onManualSummary={session.triggerManualSummary}
        onMicChange={setMicDeviceId}
      />

      {/* Desktop layout: two columns */}
      <div className="hidden md:grid md:grid-cols-2 md:gap-4">
        <RealtimeTranscriptView
          accumulatedTranscript={session.accumulatedTranscript}
          currentPartial={session.currentPartial}
          isSessionActive={isActive}
          onCopy={handleCopyTranscript}
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
            onCopy={handleCopyTranscript}
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
      {session.isSessionEnded && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => session.resetSession()} className="hover:bg-primary/75">
            Start New Session
          </Button>
        </div>
      )}
    </div>
  );
}
