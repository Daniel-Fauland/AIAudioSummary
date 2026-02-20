"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Header } from "@/components/layout/Header";
import { StepIndicator } from "@/components/layout/StepIndicator";
import { SettingsSheet } from "@/components/layout/SettingsSheet";
import { FileUpload } from "@/components/workflow/FileUpload";
import { AudioRecorder } from "@/components/workflow/AudioRecorder";
import { TranscriptView } from "@/components/workflow/TranscriptView";
import { SpeakerMapper } from "@/components/workflow/SpeakerMapper";
import { PromptEditor } from "@/components/workflow/PromptEditor";
import { SummaryView } from "@/components/workflow/SummaryView";
import { RealtimeMode } from "@/components/realtime/RealtimeMode";
import { Button } from "@/components/ui/button";
import { useConfig } from "@/hooks/useConfig";
import { useApiKeys } from "@/hooks/useApiKeys";
import { useCustomTemplates } from "@/hooks/useCustomTemplates";
import { createTranscript, createSummary, extractKeyPoints } from "@/lib/api";
import type { AzureConfig, LLMProvider, SummaryInterval } from "@/lib/types";

const PROVIDER_KEY = "aias:v1:selected_provider";
const MODEL_KEY_PREFIX = "aias:v1:model:";
const AUTO_KEY_POINTS_KEY = "aias:v1:auto_key_points";
const MIN_SPEAKERS_KEY = "aias:v1:min_speakers";
const MAX_SPEAKERS_KEY = "aias:v1:max_speakers";
const APP_MODE_KEY = "aias:v1:app_mode";
const REALTIME_INTERVAL_KEY = "aias:v1:realtime_interval";
const REALTIME_FINAL_SUMMARY_KEY = "aias:v1:realtime_final_summary";
const REALTIME_SYSTEM_PROMPT_KEY = "aias:v1:realtime_system_prompt";

export const DEFAULT_REALTIME_SYSTEM_PROMPT = `You are a real-time meeting assistant maintaining a live, structured & concise summary of an ongoing conversation.

Your summary must:
- Use clear headings (## Topic) and concise bullet points
- Capture key topics, decisions, and action items discussed so far
- Be written entirely in {language}

Stability rules — these are strict:
- On incremental updates, preserve ALL existing sections and bullets verbatim unless new content directly updates them
- Only add or modify the specific bullets that are explicitly supported by the new transcript chunk
- Never remove information that was in the previous summary
- Never introduce topics, details, or action items not present in the transcript`;

function safeGet(key: string, fallback: string): string {
  try {
    if (typeof window === "undefined") return fallback;
    const value = localStorage.getItem(key);
    return value ? value : fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: string): void {
  try {
    if (typeof window !== "undefined") localStorage.setItem(key, value);
  } catch {
    // noop
  }
}

export default function Home() {
  const { config, loading: configLoading, error: configError, refetch } = useConfig();
  const { getKey, hasKey, getAzureConfig } = useApiKeys();
  const {
    templates: customTemplates,
    saveTemplate: saveCustomTemplate,
    deleteTemplate: deleteCustomTemplate,
  } = useCustomTemplates();

  // Settings panel
  const [settingsOpen, setSettingsOpen] = useState(false);

  // App mode
  const [appMode, setAppMode] = useState<"standard" | "realtime">(
    () => safeGet(APP_MODE_KEY, "standard") as "standard" | "realtime",
  );

  const handleModeChange = useCallback((mode: "standard" | "realtime") => {
    setAppMode(mode);
    safeSet(APP_MODE_KEY, mode);
  }, []);

  // Provider / model (persisted in localStorage)
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>(
    () => safeGet(PROVIDER_KEY, "openai") as LLMProvider,
  );
  const [selectedModel, setSelectedModel] = useState<string>(() =>
    safeGet(`${MODEL_KEY_PREFIX}${safeGet(PROVIDER_KEY, "openai")}`, "gpt-5.2"),
  );
  const [azureConfig, setAzureConfig] = useState<AzureConfig | null>(() => getAzureConfig());

  // Workflow state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [step1Mode, setStep1Mode] = useState<"upload" | "record">("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [summary, setSummary] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Prompt settings
  const [selectedPrompt, setSelectedPrompt] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [informalGerman, setInformalGerman] = useState(true);
  const [meetingDate, setMeetingDate] = useState<string | null>(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [authorSpeaker, setAuthorSpeaker] = useState<string | null>(null);

  // Speaker key points
  const [speakerKeyPoints, setSpeakerKeyPoints] = useState<Record<string, string>>({});
  const [isExtractingKeyPoints, setIsExtractingKeyPoints] = useState(false);
  const [autoKeyPointsEnabled, setAutoKeyPointsEnabled] = useState(
    () => safeGet(AUTO_KEY_POINTS_KEY, "true") !== "false",
  );
  const [minSpeakers, setMinSpeakers] = useState<number>(
    () => parseInt(safeGet(MIN_SPEAKERS_KEY, "1")) || 1,
  );
  const [maxSpeakers, setMaxSpeakers] = useState<number>(
    () => parseInt(safeGet(MAX_SPEAKERS_KEY, "10")) || 10,
  );
  const [realtimeSummaryInterval, setRealtimeSummaryInterval] = useState<SummaryInterval>(
    () => (parseInt(safeGet(REALTIME_INTERVAL_KEY, "2")) || 2) as SummaryInterval,
  );
  const [realtimeFinalSummaryEnabled, setRealtimeFinalSummaryEnabled] = useState(
    () => safeGet(REALTIME_FINAL_SUMMARY_KEY, "true") !== "false",
  );
  const [realtimeSystemPrompt, setRealtimeSystemPrompt] = useState(
    () => safeGet(REALTIME_SYSTEM_PROMPT_KEY, DEFAULT_REALTIME_SYSTEM_PROMPT),
  );
  const hasAutoExtractedKeyPointsRef = useRef(false);
  // Accumulated speaker renames: original label → new name
  const speakerRenamesRef = useRef<Record<string, string>>({});

  // Global keyboard shortcut: Alt/Option + S to toggle settings
  const settingsOpenRef = useRef(settingsOpen);
  settingsOpenRef.current = settingsOpen;

  useEffect(() => {
    let closeTimeout: ReturnType<typeof setTimeout>;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.code === "KeyS") {
        e.preventDefault();
        if (settingsOpenRef.current) {
          // Delay close so the S key highlight is visible
          closeTimeout = setTimeout(() => setSettingsOpen(false), 200);
        } else {
          setSettingsOpen(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(closeTimeout);
    };
  }, []);

  // Set default prompt from first template
  useEffect(() => {
    if (config && config.prompt_templates.length > 0 && !selectedPrompt) {
      setSelectedPrompt(config.prompt_templates[0].content);
    }
  }, [config, selectedPrompt]);

  // Provider change: persist + update model
  const handleProviderChange = useCallback(
    (provider: LLMProvider) => {
      setSelectedProvider(provider);
      safeSet(PROVIDER_KEY, provider);
      const providerInfo = config?.providers.find((p) => p.id === provider);
      const defaultModel = safeGet(`${MODEL_KEY_PREFIX}${provider}`, "") || providerInfo?.models[0] || "";
      setSelectedModel(defaultModel);
    },
    [config],
  );

  const handleModelChange = useCallback(
    (model: string) => {
      setSelectedModel(model);
      safeSet(`${MODEL_KEY_PREFIX}${selectedProvider}`, model);
    },
    [selectedProvider],
  );

  const handleAutoKeyPointsChange = useCallback((enabled: boolean) => {
    setAutoKeyPointsEnabled(enabled);
    safeSet(AUTO_KEY_POINTS_KEY, enabled ? "true" : "false");
  }, []);

  const handleMinSpeakersChange = useCallback((value: number) => {
    setMinSpeakers(value);
    safeSet(MIN_SPEAKERS_KEY, String(value));
  }, []);

  const handleMaxSpeakersChange = useCallback((value: number) => {
    setMaxSpeakers(value);
    safeSet(MAX_SPEAKERS_KEY, String(value));
  }, []);

  const handleRealtimeSummaryIntervalChange = useCallback((interval: SummaryInterval) => {
    setRealtimeSummaryInterval(interval);
    safeSet(REALTIME_INTERVAL_KEY, String(interval));
  }, []);

  const handleRealtimeFinalSummaryEnabledChange = useCallback((enabled: boolean) => {
    setRealtimeFinalSummaryEnabled(enabled);
    safeSet(REALTIME_FINAL_SUMMARY_KEY, enabled ? "true" : "false");
  }, []);

  const handleRealtimeSystemPromptChange = useCallback((prompt: string) => {
    setRealtimeSystemPrompt(prompt);
    safeSet(REALTIME_SYSTEM_PROMPT_KEY, prompt);
  }, []);

  const applyRenames = useCallback((keyPoints: Record<string, string>): Record<string, string> => {
    const renames = speakerRenamesRef.current;
    if (Object.keys(renames).length === 0) return keyPoints;
    const remapped: Record<string, string> = {};
    for (const [key, value] of Object.entries(keyPoints)) {
      remapped[renames[key] ?? key] = value;
    }
    return remapped;
  }, []);

  const doExtractKeyPoints = useCallback(
    async (transcriptText: string, speakers: string[]) => {
      const llmKey = getKey(selectedProvider);
      if (!llmKey) return;

      setIsExtractingKeyPoints(true);
      try {
        const result = await extractKeyPoints({
          provider: selectedProvider,
          api_key: llmKey,
          model: selectedModel,
          azure_config: selectedProvider === "azure_openai" ? azureConfig : null,
          transcript: transcriptText,
          speakers,
        });
        setSpeakerKeyPoints(applyRenames(result.key_points));
      } catch {
        // Convenience feature — fail silently
      } finally {
        setIsExtractingKeyPoints(false);
      }
    },
    [getKey, selectedProvider, selectedModel, azureConfig, applyRenames],
  );

  const handleAutoExtractKeyPoints = useCallback(
    (transcriptText: string, speakers: string[]) => {
      if (!autoKeyPointsEnabled) return;
      if (hasAutoExtractedKeyPointsRef.current) return;
      hasAutoExtractedKeyPointsRef.current = true;
      doExtractKeyPoints(transcriptText, speakers);
    },
    [autoKeyPointsEnabled, doExtractKeyPoints],
  );

  const handleManualExtractKeyPoints = useCallback(
    (transcriptText: string, speakers: string[]) => {
      speakerRenamesRef.current = {};
      doExtractKeyPoints(transcriptText, speakers);
    },
    [doExtractKeyPoints],
  );

  // Called when the speaker count changes, indicating the transcript was replaced
  // rather than edited in-place. Re-triggers auto key point extraction if enabled.
  const handleTranscriptReplaced = useCallback(
    (transcriptText: string, speakers: string[]) => {
      if (!autoKeyPointsEnabled) return;
      // Clear stale state from the previous transcript
      speakerRenamesRef.current = {};
      setSpeakerKeyPoints({});
      // Mark as auto-extracted so onAutoExtractKeyPoints won't fire a second time
      hasAutoExtractedKeyPointsRef.current = true;
      doExtractKeyPoints(transcriptText, speakers);
    },
    [autoKeyPointsEnabled, doExtractKeyPoints],
  );

  const handleKeyPointsRemap = useCallback((mappings: Record<string, string>) => {
    // Store renames so in-flight API responses can be remapped on arrival
    const existing = speakerRenamesRef.current;
    const merged: Record<string, string> = {};
    // Update existing renames: if "Speaker A" → "Daniel" was stored, keep the original key
    for (const [origKey, curName] of Object.entries(existing)) {
      merged[origKey] = mappings[curName] ?? curName;
    }
    // Add new renames that aren't already tracked
    for (const [from, to] of Object.entries(mappings)) {
      const alreadyTracked = Object.values(existing).includes(from);
      if (!alreadyTracked && !existing[from]) {
        merged[from] = to;
      }
    }
    speakerRenamesRef.current = merged;

    // Also remap any already-loaded key points
    setSpeakerKeyPoints((prev) => {
      const remapped: Record<string, string> = {};
      for (const [key, value] of Object.entries(prev)) {
        remapped[mappings[key] ?? key] = value;
      }
      return remapped;
    });
  }, []);

  // Step 1 → 2: file selected, start transcription
  const handleFileSelected = useCallback(
    async (file: File) => {
      setSelectedFile(file);
      const assemblyAiKey = getKey("assemblyai");
      if (!assemblyAiKey) {
        toast.error("Please add your AssemblyAI API key in Settings.");
        return;
      }

      setIsUploading(true);
      setCurrentStep(2);
      setIsTranscribing(true);
      hasAutoExtractedKeyPointsRef.current = false;
      speakerRenamesRef.current = {};
      setSpeakerKeyPoints({});

      try {
        const result = await createTranscript(file, assemblyAiKey, undefined, minSpeakers, maxSpeakers);
        setTranscript(result);
        toast.success("Transcription complete!");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Transcription failed");
        setCurrentStep(1);
        setSelectedFile(null);
      } finally {
        setIsUploading(false);
        setIsTranscribing(false);
      }
    },
    [getKey, minSpeakers, maxSpeakers],
  );

  // Skip upload: go directly to step 2 with empty transcript
  const handleSkipUpload = useCallback(() => {
    setCurrentStep(2);
    setTranscript("");
    setSelectedFile(null);
  }, []);

  // Step 2 → 3: generate summary
  const handleGenerate = useCallback(async () => {
    const llmKey = getKey(selectedProvider);
    if (!llmKey) {
      toast.error(`Please add your ${selectedProvider} API key in Settings.`);
      setSettingsOpen(true);
      return;
    }

    setCurrentStep(3);
    setIsGenerating(true);
    setSummary("");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await createSummary(
        {
          provider: selectedProvider,
          api_key: llmKey,
          model: selectedModel,
          azure_config: selectedProvider === "azure_openai" ? azureConfig : null,
          stream: true,
          system_prompt: selectedPrompt,
          text: transcript,
          target_language: selectedLanguage,
          informal_german: informalGerman,
          date: meetingDate,
          author: authorSpeaker,
        },
        (chunk) => {
          setSummary((prev) => prev + chunk);
        },
        controller.signal,
      );
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        // User stopped generation — not an error
      } else {
        toast.error(e instanceof Error ? e.message : "Summary generation failed");
      }
    } finally {
      abortControllerRef.current = null;
      setIsGenerating(false);
    }
  }, [
    getKey,
    selectedProvider,
    selectedModel,
    azureConfig,
    selectedPrompt,
    transcript,
    selectedLanguage,
    informalGerman,
    meetingDate,
    authorSpeaker,
  ]);

  const handleStopGenerating = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const handleRegenerate = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  const handleBackToTranscript = useCallback(() => {
    setCurrentStep(2);
  }, []);

  const handleStartOver = useCallback(() => {
    setCurrentStep(1);
    setSelectedFile(null);
    setTranscript("");
    setSummary("");
    setSpeakerKeyPoints({});
    hasAutoExtractedKeyPointsRef.current = false;
    speakerRenamesRef.current = {};
    setIsGenerating(false);
    setIsTranscribing(false);
    setAuthorSpeaker(null);
  }, []);

  const hasLlmKey = hasKey(selectedProvider);
  const hasAssemblyAiKey = hasKey("assemblyai");

  // Config loading state
  if (configLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex h-16 items-center border-b border-border bg-card px-4 md:px-6">
          <div className="h-6 w-48 animate-pulse rounded bg-card-elevated" />
        </div>
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
          <div className="flex justify-center gap-4 py-6">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="h-10 w-10 animate-pulse rounded-full bg-card-elevated" />
            ))}
          </div>
          <div className="h-60 animate-pulse rounded-lg bg-card-elevated" />
        </div>
      </div>
    );
  }

  // Config error state
  if (configError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <p className="text-destructive">Failed to load configuration</p>
          <p className="text-sm text-foreground-muted">{configError}</p>
          <p className="text-xs text-foreground-muted">Make sure the backend is running and reachable</p>
          <Button onClick={refetch}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onSettingsClick={() => setSettingsOpen(true)} />

      <SettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        config={config}
        selectedProvider={selectedProvider}
        onProviderChange={handleProviderChange}
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
        azureConfig={azureConfig}
        onAzureConfigChange={setAzureConfig}
        autoKeyPointsEnabled={autoKeyPointsEnabled}
        onAutoKeyPointsChange={handleAutoKeyPointsChange}
        minSpeakers={minSpeakers}
        onMinSpeakersChange={handleMinSpeakersChange}
        maxSpeakers={maxSpeakers}
        onMaxSpeakersChange={handleMaxSpeakersChange}
        realtimeSummaryInterval={realtimeSummaryInterval}
        onRealtimeSummaryIntervalChange={handleRealtimeSummaryIntervalChange}
        realtimeFinalSummaryEnabled={realtimeFinalSummaryEnabled}
        onRealtimeFinalSummaryEnabledChange={handleRealtimeFinalSummaryEnabledChange}
        realtimeSystemPrompt={realtimeSystemPrompt}
        onRealtimeSystemPromptChange={handleRealtimeSystemPromptChange}
        defaultRealtimeSystemPrompt={DEFAULT_REALTIME_SYSTEM_PROMPT}
      />

      <div className="mx-auto max-w-6xl px-4 md:px-6">
        {/* Mode tab bar */}
        <div className="flex border-b border-border mt-4 mb-2">
          <button
            type="button"
            onClick={() => handleModeChange("standard")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              appMode === "standard"
                ? "border-b-2 border-primary text-foreground -mb-px"
                : "text-foreground-muted hover:text-foreground-secondary"
            }`}
          >
            Standard
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("realtime")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              appMode === "realtime"
                ? "border-b-2 border-primary text-foreground -mb-px"
                : "text-foreground-muted hover:text-foreground-secondary"
            }`}
          >
            Realtime
          </button>
        </div>

        {appMode === "realtime" ? (
          <div className="step-content space-y-6 pb-8">
            <RealtimeMode
              config={config}
              selectedProvider={selectedProvider}
              selectedModel={selectedModel}
              azureConfig={azureConfig}
              selectedLanguage={selectedLanguage}
              informalGerman={informalGerman}
              meetingDate={meetingDate ?? ""}
              authorSpeaker={authorSpeaker ?? ""}
              getKey={getKey}
              hasKey={hasKey}
              onOpenSettings={() => setSettingsOpen(true)}
              summaryInterval={realtimeSummaryInterval}
              realtimeFinalSummaryEnabled={realtimeFinalSummaryEnabled}
              realtimeSystemPrompt={realtimeSystemPrompt}
            />
          </div>
        ) : (
          <>
        <StepIndicator currentStep={currentStep} />

        <div className="step-content space-y-6 pb-8" key={currentStep}>
          {/* Step 1: Upload or Record */}
          {currentStep === 1 ? (
            <div className="space-y-4">
              {/* Mode toggle */}
              <div className="flex border-b border-border">
                <button
                  type="button"
                  onClick={() => setStep1Mode("upload")}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    step1Mode === "upload"
                      ? "border-b-2 border-primary text-foreground -mb-px"
                      : "text-foreground-muted hover:text-foreground-secondary"
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setStep1Mode("record")}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    step1Mode === "record"
                      ? "border-b-2 border-primary text-foreground -mb-px"
                      : "text-foreground-muted hover:text-foreground-secondary"
                  }`}
                >
                  Record Audio
                </button>
              </div>

              {step1Mode === "upload" ? (
                <FileUpload
                  onFileSelected={handleFileSelected}
                  onSkipUpload={handleSkipUpload}
                  onOpenSettings={() => setSettingsOpen(true)}
                  disabled={isUploading}
                  uploading={isUploading}
                  hasAssemblyAiKey={hasAssemblyAiKey}
                />
              ) : (
                <AudioRecorder
                  onFileSelected={handleFileSelected}
                  onSkipUpload={handleSkipUpload}
                  onOpenSettings={() => setSettingsOpen(true)}
                  disabled={isUploading}
                  uploading={isUploading}
                  hasAssemblyAiKey={hasAssemblyAiKey}
                />
              )}
            </div>
          ) : null}

          {/* Step 2: Transcript + Speakers + Prompt */}
          {currentStep === 2 ? (
            <>
              <TranscriptView
                transcript={transcript}
                onTranscriptChange={setTranscript}
                loading={isTranscribing}
              />

              {!isTranscribing && transcript ? (
                <>
                  <SpeakerMapper
                    transcript={transcript}
                    onTranscriptUpdate={setTranscript}
                    authorSpeaker={authorSpeaker}
                    onAuthorSpeakerChange={setAuthorSpeaker}
                    keyPoints={speakerKeyPoints}
                    isExtractingKeyPoints={isExtractingKeyPoints}
                    onAutoExtractKeyPoints={handleAutoExtractKeyPoints}
                    onManualExtractKeyPoints={handleManualExtractKeyPoints}
                    onKeyPointsRemap={handleKeyPointsRemap}
                    onTranscriptReplaced={handleTranscriptReplaced}
                  />
                  <PromptEditor
                    templates={config?.prompt_templates ?? []}
                    customTemplates={customTemplates}
                    onSaveCustomTemplate={saveCustomTemplate}
                    onDeleteCustomTemplate={deleteCustomTemplate}
                    languages={config?.languages ?? []}
                    selectedPrompt={selectedPrompt}
                    onPromptChange={setSelectedPrompt}
                    selectedLanguage={selectedLanguage}
                    onLanguageChange={setSelectedLanguage}
                    informalGerman={informalGerman}
                    onInformalGermanChange={setInformalGerman}
                    meetingDate={meetingDate}
                    onMeetingDateChange={setMeetingDate}
                    onGenerate={handleGenerate}
                    generateDisabled={!transcript || !hasLlmKey || !selectedModel}
                    generating={isGenerating}
                    hasLlmKey={hasLlmKey}
                    onOpenSettings={() => setSettingsOpen(true)}
                  />
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={handleStartOver}>
                      Start Over
                    </Button>
                  </div>
                </>
              ) : null}
            </>
          ) : null}

          {/* Step 3: Summary (side-by-side with transcript) */}
          {currentStep === 3 ? (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <TranscriptView transcript={transcript} onTranscriptChange={setTranscript} readOnly />
                <SummaryView
                  summary={summary}
                  loading={isGenerating}
                  onStop={handleStopGenerating}
                  onRegenerate={handleRegenerate}
                  onBack={handleBackToTranscript}
                />
              </div>
              {!isGenerating ? (
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={handleStartOver}>
                    Start Over
                  </Button>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
          </>
        )}
      </div>
    </div>
  );
}
