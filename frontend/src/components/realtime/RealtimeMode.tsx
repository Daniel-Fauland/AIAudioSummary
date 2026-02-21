"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RealtimeControls } from "./RealtimeControls";
import { RealtimeTranscriptView } from "./RealtimeTranscriptView";
import { RealtimeSummaryView } from "./RealtimeSummaryView";
import { LiveQuestions } from "@/components/live-transcript/LiveQuestions";
import { useLiveQuestions } from "@/components/live-transcript/useLiveQuestions";
import { useRealtimeSession } from "@/hooks/useRealtimeSession";
import type {
  AzureConfig,
  LangdockConfig,
  ConfigResponse,
  LLMProvider,
  SummaryInterval,
} from "@/lib/types";

interface RealtimeModeProps {
  config: ConfigResponse | null;
  selectedProvider: LLMProvider;
  selectedModel: string;
  azureConfig: AzureConfig | null;
  langdockConfig: LangdockConfig;
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
  /** Provider/model to use for Live Question Evaluation (may differ from main summary provider) */
  liveQuestionsProvider: LLMProvider;
  liveQuestionsModel: string;
}

export function RealtimeMode({
  selectedProvider,
  selectedModel,
  azureConfig,
  langdockConfig,
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
  liveQuestionsProvider,
  liveQuestionsModel,
}: RealtimeModeProps) {
  const session = useRealtimeSession();
  const liveQuestions = useLiveQuestions();

  const [mobileTab, setMobileTab] = useState<"transcript" | "summary">("transcript");
  const [micDeviceId, setMicDeviceId] = useState<string | undefined>(undefined);
  const [recordMode, setRecordMode] = useState<"mic" | "meeting">("mic");

  const isActive = session.connectionStatus === "connected" || session.connectionStatus === "reconnecting";

  // Track previous isSummaryUpdating value to detect when a summary run starts
  const prevIsSummaryUpdatingRef = useRef(false);

  // Keep LLM config in sync with settings
  useEffect(() => {
    session.setLlmConfig({
      provider: selectedProvider,
      apiKey: getKey(selectedProvider),
      model: selectedModel,
      azureConfig: azureConfig || undefined,
      langdockConfig: selectedProvider === "langdock" ? langdockConfig : undefined,
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
    langdockConfig,
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

  // Trigger live question evaluation in parallel whenever a summary update starts
  useEffect(() => {
    const wasUpdating = prevIsSummaryUpdatingRef.current;
    const isNowUpdating = session.isSummaryUpdating;

    if (!wasUpdating && isNowUpdating) {
      const transcript = session.accumulatedTranscript;
      if (liveQuestions.shouldEvaluate(transcript)) {
        const apiKey = getKey(liveQuestionsProvider);
        if (apiKey) {
          liveQuestions.triggerEvaluation(transcript, {
            provider: liveQuestionsProvider,
            apiKey,
            model: liveQuestionsModel,
            azureConfig: liveQuestionsProvider === "azure_openai" ? azureConfig ?? undefined : undefined,
            langdockConfig: liveQuestionsProvider === "langdock" ? langdockConfig : undefined,
          });
        }
      }
    }

    prevIsSummaryUpdatingRef.current = isNowUpdating;
  }, [
    session.isSummaryUpdating,
    session.accumulatedTranscript,
    liveQuestions,
    liveQuestionsProvider,
    liveQuestionsModel,
    azureConfig,
    langdockConfig,
    getKey,
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

    session.startSession(getKey("assemblyai"), micDeviceId, recordMode);
  }, [hasKey, selectedProvider, getKey, micDeviceId, onOpenSettings, session]);

  const handleCopyTranscript = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(session.accumulatedTranscript);
      toast.success("Transcript copied to clipboard", { position: "bottom-center" });
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }, [session.accumulatedTranscript]);

  const handleResetSession = useCallback(() => {
    session.resetSession();
    liveQuestions.resetEvaluationTracking();
  }, [session, liveQuestions]);

  const liveQuestionsCard = (
    <LiveQuestions
      questions={liveQuestions.questions}
      isEvaluating={liveQuestions.isEvaluating}
      warningDismissed={liveQuestions.warningDismissed}
      onAdd={liveQuestions.addQuestion}
      onRemove={liveQuestions.removeQuestion}
      onReset={liveQuestions.resetQuestion}
      onDismissWarning={liveQuestions.dismissWarning}
    />
  );

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
        recordMode={recordMode}
        onStart={handleStart}
        onPause={session.pauseSession}
        onResume={session.resumeSession}
        onStop={() => session.stopSession(realtimeFinalSummaryEnabled)}
        onManualSummary={session.triggerManualSummary}
        onMicChange={setMicDeviceId}
        onRecordModeChange={setRecordMode}
      />

      {/* Desktop layout: two columns for transcript+summary, then full-width questions */}
      <div className="hidden md:block md:space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <RealtimeTranscriptView
            accumulatedTranscript={session.accumulatedTranscript}
            currentPartial={session.currentPartial}
            committedPartial={session.committedPartial}
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
        {liveQuestionsCard}
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
            committedPartial={session.committedPartial}
            isSessionActive={isActive}
            onCopy={handleCopyTranscript}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <RealtimeSummaryView
              summary={session.realtimeSummary}
              summaryUpdatedAt={session.summaryUpdatedAt}
              isSummaryUpdating={session.isSummaryUpdating}
              isSessionEnded={session.isSessionEnded}
            />
            {liveQuestionsCard}
          </div>
        )}
      </div>

      {/* Session ended actions */}
      {session.isSessionEnded && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleResetSession}>
            Start New Session
          </Button>
        </div>
      )}
    </div>
  );
}
