"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RealtimeControls } from "./RealtimeControls";
import { RealtimeTranscriptView } from "./RealtimeTranscriptView";
import { RealtimeSummaryView } from "./RealtimeSummaryView";
import { LiveQuestions } from "@/components/live-transcript/LiveQuestions";
import { RealtimeFormOutput } from "@/components/form-output/RealtimeFormOutput";
import { useLiveQuestions } from "@/components/live-transcript/useLiveQuestions";
import { useFormOutput } from "@/components/form-output/useFormOutput";
import { useRealtimeSession } from "@/hooks/useRealtimeSession";
import type {
  AzureConfig,
  LangdockConfig,
  ConfigResponse,
  FormTemplate,
  LiveQuestion,
  LLMProvider,
  RealtimeConnectionStatus,
  SummaryInterval,
} from "@/lib/types";
import type { RealtimeSessionData } from "@/hooks/useSessionPersistence";

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
  liveQuestionsProvider: LLMProvider;
  liveQuestionsModel: string;
  onTranscriptChange?: (transcript: string) => void;
  onConnectionStatusChange?: (status: RealtimeConnectionStatus) => void;
  formOutputProvider: LLMProvider;
  formOutputModel: string;
  formOutputApiKey?: string;
  formOutputAzureConfig?: AzureConfig | null;
  formOutputLangdockConfig?: LangdockConfig;
  formTemplates: FormTemplate[];
  onSaveFormTemplate: (template: FormTemplate) => void;
  onUpdateFormTemplate: (template: FormTemplate) => void;
  onDeleteFormTemplate: (id: string) => void;
  initialRealtimeSession?: RealtimeSessionData;
  onPersistTranscript?: (value: string) => void;
  onPersistSummary?: (value: string) => void;
  onPersistQuestions?: (questions: LiveQuestion[]) => void;
  onPersistFormValues?: (values: Record<string, unknown>) => void;
  onPersistFormTemplateId?: (id: string | null) => void;
  onClearRealtimeSession?: () => void;
  onSavePreferences?: () => void;
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
  onTranscriptChange,
  onConnectionStatusChange,
  formOutputProvider,
  formOutputModel,
  formOutputApiKey,
  formOutputAzureConfig,
  formOutputLangdockConfig,
  formTemplates,
  onSaveFormTemplate,
  onUpdateFormTemplate,
  onDeleteFormTemplate,
  initialRealtimeSession,
  onPersistTranscript,
  onPersistSummary,
  onPersistQuestions,
  onPersistFormValues,
  onPersistFormTemplateId,
  onClearRealtimeSession,
  onSavePreferences,
}: RealtimeModeProps) {
  const session = useRealtimeSession({
    initialTranscript: initialRealtimeSession?.transcript,
    initialSummary: initialRealtimeSession?.summary,
  });
  const liveQuestions = useLiveQuestions({
    initialQuestions: initialRealtimeSession?.questions,
  });
  const formOutput = useFormOutput({
    initialValues: initialRealtimeSession?.formValues,
  });

  const [mobileTab, setMobileTab] = useState<"transcript" | "summary">("transcript");
  const [bottomTab, setBottomTab] = useState<"questions" | "form">("questions");
  const [micDeviceId, setMicDeviceId] = useState<string | undefined>(undefined);
  const [recordMode, setRecordMode] = useState<"mic" | "meeting">("mic");
  const [selectedFormTemplateId, setSelectedFormTemplateId] = useState<string | null>(
    initialRealtimeSession?.formTemplateId ?? null,
  );
  const [startConfirmOpen, setStartConfirmOpen] = useState(false);

  const isActive = session.connectionStatus === "connected" || session.connectionStatus === "reconnecting";

  // Notify parent of full transcript
  useEffect(() => {
    const full = [session.accumulatedTranscript, session.committedPartial, session.currentPartial]
      .filter(Boolean)
      .join(" ");
    onTranscriptChange?.(full);
  }, [session.accumulatedTranscript, session.committedPartial, session.currentPartial, onTranscriptChange]);

  // Notify parent of connection status changes
  useEffect(() => {
    onConnectionStatusChange?.(session.connectionStatus);
  }, [session.connectionStatus, onConnectionStatusChange]);

  // Persist session data to localStorage on changes
  useEffect(() => {
    if (session.accumulatedTranscript) onPersistTranscript?.(session.accumulatedTranscript);
  }, [session.accumulatedTranscript, onPersistTranscript]);

  useEffect(() => {
    if (session.realtimeSummary) onPersistSummary?.(session.realtimeSummary);
  }, [session.realtimeSummary, onPersistSummary]);

  useEffect(() => {
    onPersistQuestions?.(liveQuestions.questions);
  }, [liveQuestions.questions, onPersistQuestions]);

  useEffect(() => {
    if (Object.keys(formOutput.values).length > 0) onPersistFormValues?.(formOutput.values);
  }, [formOutput.values, onPersistFormValues]);

  useEffect(() => {
    onPersistFormTemplateId?.(selectedFormTemplateId);
  }, [selectedFormTemplateId, onPersistFormTemplateId]);

  // Listen for sync-initiated clear events from GlobalSyncContext
  useEffect(() => {
    const handler = (e: CustomEvent<{ scope: "transcript-summary" | "all" }>) => {
      const { scope } = e.detail;
      // Always clear summary and transcript persistence
      session.clearSummary();
      onPersistTranscript?.("");
      onPersistSummary?.("");
      if (scope === "all") {
        liveQuestions.clearAll();
        liveQuestions.resetEvaluationTracking();
        formOutput.resetForm();
        setSelectedFormTemplateId(null);
        onClearRealtimeSession?.();
      }
    };
    window.addEventListener("aias:sync-clear-realtime", handler as EventListener);
    return () => window.removeEventListener("aias:sync-clear-realtime", handler as EventListener);
  }, [session, liveQuestions, formOutput, onPersistTranscript, onPersistSummary, onClearRealtimeSession]);

  // Sync preferences when realtime session ends (includes final summary)
  const prevIsSessionEndedRef = useRef(false);
  useEffect(() => {
    if (session.isSessionEnded && !prevIsSessionEndedRef.current) {
      // Small delay to let final summary persist to localStorage first
      const timer = setTimeout(() => onSavePreferences?.(), 500);
      prevIsSessionEndedRef.current = true;
      return () => clearTimeout(timer);
    }
    if (!session.isSessionEnded) {
      prevIsSessionEndedRef.current = false;
    }
  }, [session.isSessionEnded, onSavePreferences]);

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

  // Trigger live question evaluation + form filling in parallel whenever a summary update starts
  useEffect(() => {
    const wasUpdating = prevIsSummaryUpdatingRef.current;
    const isNowUpdating = session.isSummaryUpdating;

    if (!wasUpdating && isNowUpdating) {
      const transcript = session.accumulatedTranscript;

      // Live questions
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

      // Form output (parallel)
      const selectedTemplate = formTemplates.find((t) => t.id === selectedFormTemplateId);
      if (selectedTemplate && formOutput.shouldFill(transcript)) {
        const formApiKey = getKey(formOutputProvider);
        if (formApiKey) {
          formOutput.triggerFill(transcript, selectedTemplate.fields, {
            provider: formOutputProvider,
            apiKey: formApiKey,
            model: formOutputModel,
            azureConfig: formOutputProvider === "azure_openai" ? azureConfig ?? undefined : undefined,
            langdockConfig: formOutputProvider === "langdock" ? langdockConfig : undefined,
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
    formOutput,
    formOutputProvider,
    formOutputModel,
    formTemplates,
    selectedFormTemplateId,
    azureConfig,
    langdockConfig,
    getKey,
  ]);

  const proceedWithStart = useCallback(() => {
    session.startSession(getKey("assemblyai"), micDeviceId, recordMode);
  }, [session, getKey, micDeviceId, recordMode]);

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

    if (session.accumulatedTranscript || session.realtimeSummary) {
      setStartConfirmOpen(true);
      return;
    }

    proceedWithStart();
  }, [hasKey, selectedProvider, onOpenSettings, session.accumulatedTranscript, session.realtimeSummary, proceedWithStart]);

  const handleStartContinue = useCallback(() => {
    setStartConfirmOpen(false);
    proceedWithStart();
  }, [proceedWithStart]);

  const handleStartClearTranscriptSummary = useCallback(() => {
    setStartConfirmOpen(false);
    session.clearTranscript();
    session.clearSummary();
    onPersistTranscript?.("");
    onPersistSummary?.("");
    proceedWithStart();
  }, [session, onPersistTranscript, onPersistSummary, proceedWithStart]);

  const handleStartClearAll = useCallback(() => {
    setStartConfirmOpen(false);
    session.clearTranscript();
    session.clearSummary();
    liveQuestions.clearAll();
    liveQuestions.resetEvaluationTracking();
    formOutput.resetForm();
    setSelectedFormTemplateId(null);
    onClearRealtimeSession?.();
    proceedWithStart();
  }, [session, liveQuestions, formOutput, onClearRealtimeSession, proceedWithStart]);

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
    formOutput.resetForm();
    onClearRealtimeSession?.();
    onSavePreferences?.();
  }, [session, liveQuestions, formOutput, onClearRealtimeSession, onSavePreferences]);

  const handleClearTranscript = useCallback(() => {
    session.clearTranscript();
  }, [session]);

  const handleClearSummary = useCallback(() => {
    session.clearSummary();
  }, [session]);

  const liveQuestionsCard = (
    <LiveQuestions
      questions={liveQuestions.questions}
      isEvaluating={liveQuestions.isEvaluating}
      warningDismissed={liveQuestions.warningDismissed}
      onAdd={liveQuestions.addQuestion}
      onRemove={liveQuestions.removeQuestion}
      onReset={liveQuestions.resetQuestion}
      onDismissWarning={liveQuestions.dismissWarning}
      onClearAll={liveQuestions.clearAll}
    />
  );

  const formOutputCard = (
    <RealtimeFormOutput
      templates={formTemplates}
      selectedTemplateId={selectedFormTemplateId}
      onSelectTemplate={setSelectedFormTemplateId}
      onSaveTemplate={onSaveFormTemplate}
      onUpdateTemplate={onUpdateFormTemplate}
      onDeleteTemplate={onDeleteFormTemplate}
      values={formOutput.values}
      isFilling={formOutput.isFilling}
      isComplete={formOutput.isComplete}
      onManualEdit={formOutput.setManualValue}
      onToggleComplete={formOutput.toggleComplete}
      llmProvider={formOutputProvider}
      llmApiKey={formOutputApiKey}
      llmModel={formOutputModel}
      llmAzureConfig={formOutputAzureConfig}
      llmLangdockConfig={formOutputLangdockConfig}
    />
  );

  // Tabbed bottom section
  const bottomSection = (
    <div>
      <div className="flex border-b border-border mb-3">
        <button
          className={`px-4 pb-2 text-sm font-medium transition-colors ${
            bottomTab === "questions"
              ? "border-b-2 border-primary text-foreground -mb-px"
              : "text-foreground-muted hover:text-foreground-secondary"
          }`}
          onClick={() => setBottomTab("questions")}
        >
          Questions &amp; Topics
        </button>
        <button
          className={`px-4 pb-2 text-sm font-medium transition-colors ${
            bottomTab === "form"
              ? "border-b-2 border-primary text-foreground -mb-px"
              : "text-foreground-muted hover:text-foreground-secondary"
          }`}
          onClick={() => setBottomTab("form")}
        >
          Form Output
        </button>
      </div>
      {bottomTab === "questions" ? liveQuestionsCard : formOutputCard}
    </div>
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

      {/* Desktop layout: two columns for transcript+summary, then tabbed bottom */}
      <div className="hidden md:block md:space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <RealtimeTranscriptView
            accumulatedTranscript={session.accumulatedTranscript}
            currentPartial={session.currentPartial}
            committedPartial={session.committedPartial}
            isSessionActive={isActive}
            onCopy={handleCopyTranscript}
            onClear={handleClearTranscript}
          />
          <RealtimeSummaryView
            summary={session.realtimeSummary}
            summaryUpdatedAt={session.summaryUpdatedAt}
            isSummaryUpdating={session.isSummaryUpdating}
            isSessionEnded={session.isSessionEnded}
            onClear={handleClearSummary}
          />
        </div>
        {bottomSection}
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
            onClear={handleClearTranscript}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <RealtimeSummaryView
              summary={session.realtimeSummary}
              summaryUpdatedAt={session.summaryUpdatedAt}
              isSummaryUpdating={session.isSummaryUpdating}
              isSessionEnded={session.isSessionEnded}
              onClear={handleClearSummary}
            />
            {bottomSection}
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

      {/* Start session confirmation dialog */}
      <Dialog open={startConfirmOpen} onOpenChange={(open) => { if (!open) setStartConfirmOpen(false); }}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <DialogTitle>Existing Session Data</DialogTitle>
            <DialogDescription>
              Your current session has existing transcript or summary content.
              How would you like to proceed?
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button variant="secondary" onClick={handleStartContinue}>
              Continue with Existing
            </Button>
            <Button variant="secondary" onClick={handleStartClearTranscriptSummary}>
              Clear Transcript &amp; Summary
            </Button>
            <Button variant="destructive" onClick={handleStartClearAll}>
              Clear All
            </Button>
            <Button variant="ghost" onClick={() => setStartConfirmOpen(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
