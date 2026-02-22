"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useConfig } from "@/hooks/useConfig";
import { useApiKeys } from "@/hooks/useApiKeys";
import { useCustomTemplates } from "@/hooks/useCustomTemplates";
import { usePreferences } from "@/hooks/usePreferences";
import { createTranscript, createSummary, extractKeyPoints } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { AzureConfig, LangdockConfig, LLMProvider, SummaryInterval, LLMFeature, FeatureModelOverride, ConfigResponse } from "@/lib/types";

const PROVIDER_KEY = "aias:v1:selected_provider";
const MODEL_KEY_PREFIX = "aias:v1:model:";
const AUTO_KEY_POINTS_KEY = "aias:v1:auto_key_points";
const MIN_SPEAKERS_KEY = "aias:v1:min_speakers";
const MAX_SPEAKERS_KEY = "aias:v1:max_speakers";
const APP_MODE_KEY = "aias:v1:app_mode";
const REALTIME_INTERVAL_KEY = "aias:v1:realtime_interval";
const REALTIME_FINAL_SUMMARY_KEY = "aias:v1:realtime_final_summary";
const REALTIME_SYSTEM_PROMPT_KEY = "aias:v1:realtime_system_prompt";
const FEATURE_OVERRIDES_KEY = "aias:v1:feature_overrides";

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

// ─── Inner component ─────────────────────────────────────────────────────────
// This component only mounts AFTER preferences have finished loading.
// Server preferences are passed directly as props and used as the primary
// source in useState initialisers, with localStorage as fallback. This avoids
// relying on applyPreferences() writing to localStorage before mount.

interface HomeInnerProps {
  config: ConfigResponse | null;
  savePreferences: () => void;
  setStorageMode: (mode: "local" | "account") => void;
  serverPreferences: import("@/lib/types").UserPreferences | null;
}

function HomeInner({ config, savePreferences, setStorageMode, serverPreferences }: HomeInnerProps) {
  const { getKey, hasKey, getAzureConfig, getLangdockConfig, setLangdockConfig } = useApiKeys();
  const {
    templates: customTemplates,
    saveTemplate: rawSaveCustomTemplate,
    deleteTemplate: rawDeleteCustomTemplate,
  } = useCustomTemplates();

  const saveCustomTemplate = useCallback((name: string, content: string) => {
    const result = rawSaveCustomTemplate(name, content);
    savePreferences();
    return result;
  }, [rawSaveCustomTemplate, savePreferences]);

  const deleteCustomTemplate = useCallback((id: string) => {
    rawDeleteCustomTemplate(id);
    savePreferences();
  }, [rawDeleteCustomTemplate, savePreferences]);

  // Settings panel
  const [settingsOpen, setSettingsOpen] = useState(false);

  // App mode
  const [appMode, setAppMode] = useState<"standard" | "realtime">(
    () => (serverPreferences?.app_mode as "standard" | "realtime") || safeGet(APP_MODE_KEY, "standard") as "standard" | "realtime",
  );

  const handleModeChange = useCallback((mode: "standard" | "realtime") => {
    setAppMode(mode);
    safeSet(APP_MODE_KEY, mode);
    savePreferences();
  }, [savePreferences]);

  // Provider / model (persisted in localStorage)
  const initProvider = serverPreferences?.selected_provider || safeGet(PROVIDER_KEY, "openai");
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>(
    () => (initProvider as LLMProvider),
  );
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    const provider = initProvider;
    const serverModel = serverPreferences?.models?.[provider];
    return serverModel || safeGet(`${MODEL_KEY_PREFIX}${provider}`, "gpt-5.2");
  });
  const [azureConfig, setAzureConfig] = useState<AzureConfig | null>(() => {
    if (serverPreferences?.azure?.endpoint || serverPreferences?.azure?.api_version || serverPreferences?.azure?.deployment_name) {
      return {
        azure_endpoint: serverPreferences.azure.endpoint ?? "",
        api_version: serverPreferences.azure.api_version ?? "",
        deployment_name: serverPreferences.azure.deployment_name ?? "",
      };
    }
    return getAzureConfig();
  });
  const [langdockConfig, setLangdockConfigState] = useState<LangdockConfig>(() => getLangdockConfig());

  // Workflow state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [maxReachedStep, setMaxReachedStep] = useState<1 | 2 | 3>(1);
  const [stepNavDialogOpen, setStepNavDialogOpen] = useState(false);
  const [pendingStep, setPendingStep] = useState<1 | 2 | 3 | null>(null);
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
    () => serverPreferences?.auto_key_points !== undefined ? serverPreferences.auto_key_points : safeGet(AUTO_KEY_POINTS_KEY, "true") !== "false",
  );
  const [minSpeakers, setMinSpeakers] = useState<number>(
    () => serverPreferences?.min_speakers || parseInt(safeGet(MIN_SPEAKERS_KEY, "1")) || 1,
  );
  const [maxSpeakers, setMaxSpeakers] = useState<number>(
    () => serverPreferences?.max_speakers || parseInt(safeGet(MAX_SPEAKERS_KEY, "10")) || 10,
  );
  const [realtimeSummaryInterval, setRealtimeSummaryInterval] = useState<SummaryInterval>(
    () => (serverPreferences?.realtime_interval || parseInt(safeGet(REALTIME_INTERVAL_KEY, "2")) || 2) as SummaryInterval,
  );
  const [realtimeFinalSummaryEnabled, setRealtimeFinalSummaryEnabled] = useState(
    () => serverPreferences?.realtime_final_summary !== undefined ? serverPreferences.realtime_final_summary : safeGet(REALTIME_FINAL_SUMMARY_KEY, "true") !== "false",
  );
  const [realtimeSystemPrompt, setRealtimeSystemPrompt] = useState(
    () => serverPreferences?.realtime_system_prompt || safeGet(REALTIME_SYSTEM_PROMPT_KEY, DEFAULT_REALTIME_SYSTEM_PROMPT),
  );
  const [featureOverrides, setFeatureOverrides] = useState<
    Partial<Record<LLMFeature, FeatureModelOverride>>
  >(() => {
    if (serverPreferences?.feature_overrides && Object.keys(serverPreferences.feature_overrides).length > 0) {
      return serverPreferences.feature_overrides as Partial<Record<LLMFeature, FeatureModelOverride>>;
    }
    try {
      if (typeof window === "undefined") return {};
      const stored = localStorage.getItem(FEATURE_OVERRIDES_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
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
      savePreferences();
    },
    [config, savePreferences],
  );

  const handleModelChange = useCallback(
    (model: string) => {
      setSelectedModel(model);
      safeSet(`${MODEL_KEY_PREFIX}${selectedProvider}`, model);
      savePreferences();
    },
    [selectedProvider, savePreferences],
  );

  const handleLangdockConfigChange = useCallback((config: LangdockConfig) => {
    setLangdockConfigState(config);
    setLangdockConfig(config);
  }, [setLangdockConfig]);

  const handleAutoKeyPointsChange = useCallback((enabled: boolean) => {
    setAutoKeyPointsEnabled(enabled);
    safeSet(AUTO_KEY_POINTS_KEY, enabled ? "true" : "false");
    savePreferences();
  }, [savePreferences]);

  const handleMinSpeakersChange = useCallback((value: number) => {
    setMinSpeakers(value);
    safeSet(MIN_SPEAKERS_KEY, String(value));
    savePreferences();
  }, [savePreferences]);

  const handleMaxSpeakersChange = useCallback((value: number) => {
    setMaxSpeakers(value);
    safeSet(MAX_SPEAKERS_KEY, String(value));
    savePreferences();
  }, [savePreferences]);

  const handleRealtimeSummaryIntervalChange = useCallback((interval: SummaryInterval) => {
    setRealtimeSummaryInterval(interval);
    safeSet(REALTIME_INTERVAL_KEY, String(interval));
    savePreferences();
  }, [savePreferences]);

  const handleRealtimeFinalSummaryEnabledChange = useCallback((enabled: boolean) => {
    setRealtimeFinalSummaryEnabled(enabled);
    safeSet(REALTIME_FINAL_SUMMARY_KEY, enabled ? "true" : "false");
    savePreferences();
  }, [savePreferences]);

  const handleRealtimeSystemPromptChange = useCallback((prompt: string) => {
    setRealtimeSystemPrompt(prompt);
    safeSet(REALTIME_SYSTEM_PROMPT_KEY, prompt);
    savePreferences();
  }, [savePreferences]);

  const resolveModelConfig = useCallback(
    (feature: LLMFeature): { provider: LLMProvider; model: string } => {
      const override = featureOverrides[feature];
      return override ?? { provider: selectedProvider, model: selectedModel };
    },
    [featureOverrides, selectedProvider, selectedModel],
  );

  const handleFeatureOverridesChange = useCallback(
    (overrides: Partial<Record<LLMFeature, FeatureModelOverride>>) => {
      setFeatureOverrides(overrides);
      safeSet(FEATURE_OVERRIDES_KEY, JSON.stringify(overrides));
      savePreferences();
    },
    [savePreferences],
  );

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
      const { provider: kpProvider, model: kpModel } = resolveModelConfig("key_point_extraction");
      const llmKey = getKey(kpProvider);
      if (!llmKey) {
        toast.error(`Please add your ${kpProvider} API key in Settings.`);
        setSettingsOpen(true);
        return;
      }

      setIsExtractingKeyPoints(true);
      try {
        const result = await extractKeyPoints({
          provider: kpProvider,
          api_key: llmKey,
          model: kpModel,
          azure_config: kpProvider === "azure_openai" ? azureConfig : null,
          langdock_config: kpProvider === "langdock" ? langdockConfig : undefined,
          transcript: transcriptText,
          speakers,
        });
        setSpeakerKeyPoints(applyRenames(result.key_points));
      } catch (e) {
        toast.error(getErrorMessage(e, "keyPoints"));
      } finally {
        setIsExtractingKeyPoints(false);
      }
    },
    [resolveModelConfig, getKey, azureConfig, langdockConfig, applyRenames],
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
      setMaxReachedStep((prev) => Math.max(prev, 2) as 1 | 2 | 3);
      setIsTranscribing(true);
      hasAutoExtractedKeyPointsRef.current = false;
      speakerRenamesRef.current = {};
      setSpeakerKeyPoints({});

      try {
        const result = await createTranscript(file, assemblyAiKey, undefined, minSpeakers, maxSpeakers);
        setTranscript(result);
        toast.success("Transcription complete!");
      } catch (e) {
        toast.error(getErrorMessage(e, "transcript"));
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
    setMaxReachedStep((prev) => Math.max(prev, 2) as 1 | 2 | 3);
    setTranscript("");
    setSelectedFile(null);
  }, []);

  // Step 2 → 3: generate summary
  const handleGenerate = useCallback(async () => {
    const { provider: summaryProvider, model: summaryModel } =
      resolveModelConfig("summary_generation");
    const llmKey = getKey(summaryProvider);
    if (!llmKey) {
      toast.error(`Please add your ${summaryProvider} API key in Settings.`);
      setSettingsOpen(true);
      return;
    }

    setCurrentStep(3);
    setMaxReachedStep((prev) => Math.max(prev, 3) as 1 | 2 | 3);
    setIsGenerating(true);
    setSummary("");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await createSummary(
        {
          provider: summaryProvider,
          api_key: llmKey,
          model: summaryModel,
          azure_config: summaryProvider === "azure_openai" ? azureConfig : null,
          langdock_config: summaryProvider === "langdock" ? langdockConfig : undefined,
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
        toast.error(getErrorMessage(e, "summary"));
      }
    } finally {
      abortControllerRef.current = null;
      setIsGenerating(false);
    }
  }, [
    resolveModelConfig,
    getKey,
    azureConfig,
    langdockConfig,
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
    setMaxReachedStep(1);
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

  const handleStepClick = useCallback(
    (step: 1 | 2 | 3) => {
      if (step === currentStep) return;
      if (step > maxReachedStep) return;
      setPendingStep(step);
      setStepNavDialogOpen(true);
    },
    [currentStep, maxReachedStep],
  );

  const handleStepNavConfirm = useCallback(() => {
    if (pendingStep === null) return;
    if (pendingStep === 1) {
      abortControllerRef.current?.abort();
      setCurrentStep(1);
      setMaxReachedStep(1);
      setSelectedFile(null);
      setTranscript("");
      setSummary("");
      setSpeakerKeyPoints({});
      hasAutoExtractedKeyPointsRef.current = false;
      speakerRenamesRef.current = {};
      setIsGenerating(false);
      setIsTranscribing(false);
      setAuthorSpeaker(null);
    } else if (pendingStep === 2) {
      abortControllerRef.current?.abort();
      setIsGenerating(false);
      setCurrentStep(2);
    }
    setStepNavDialogOpen(false);
    setPendingStep(null);
  }, [pendingStep]);

  const handleStepNavCancel = useCallback(() => {
    setStepNavDialogOpen(false);
    setPendingStep(null);
  }, []);

  // Derived resolved configs for each LLM feature
  const resolvedSummaryConfig =
    featureOverrides["summary_generation"] ?? { provider: selectedProvider, model: selectedModel };
  const resolvedRealtimeConfig =
    featureOverrides["realtime_summary"] ?? { provider: selectedProvider, model: selectedModel };
  const resolvedPromptAssistantConfig =
    featureOverrides["prompt_assistant"] ?? { provider: selectedProvider, model: selectedModel };
  const resolvedLiveQuestionsConfig =
    featureOverrides["live_question_evaluation"] ?? { provider: selectedProvider, model: selectedModel };

  const hasLlmKey = hasKey(resolvedSummaryConfig.provider);
  const hasAssemblyAiKey = hasKey("assemblyai");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1">
      <Header onSettingsClick={() => setSettingsOpen(true)} onStorageModeChange={setStorageMode} />

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
        langdockConfig={langdockConfig}
        onLangdockConfigChange={handleLangdockConfigChange}
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
        featureOverrides={featureOverrides}
        onFeatureOverridesChange={handleFeatureOverridesChange}
      />

      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        {/* Mode segmented control */}
        <div className="flex justify-center mt-4 mb-4">
          <div className="inline-flex rounded-lg border border-border bg-card-elevated p-1">
            <button
              type="button"
              onClick={() => handleModeChange("standard")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                appMode === "standard"
                  ? "bg-primary text-primary-foreground"
                  : "bg-transparent text-foreground-secondary hover:text-foreground"
              }`}
            >
              Standard
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("realtime")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                appMode === "realtime"
                  ? "bg-primary text-primary-foreground"
                  : "bg-transparent text-foreground-secondary hover:text-foreground"
              }`}
            >
              Realtime
            </button>
          </div>
        </div>

        {appMode === "realtime" ? (
          <div className="step-content space-y-6 pb-8">
            <RealtimeMode
              config={config}
              selectedProvider={resolvedRealtimeConfig.provider}
              selectedModel={resolvedRealtimeConfig.model}
              azureConfig={azureConfig}
              langdockConfig={langdockConfig}
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
              liveQuestionsProvider={resolvedLiveQuestionsConfig.provider}
              liveQuestionsModel={resolvedLiveQuestionsConfig.model}
            />
          </div>
        ) : (
          <>
        <StepIndicator
          currentStep={currentStep}
          maxReachedStep={maxReachedStep}
          onStepClick={handleStepClick}
        />

        <div className="step-content space-y-6 pb-8" key={currentStep}>
          {/* Step 1: Upload or Record */}
          {currentStep === 1 ? (
            <div className="space-y-3">
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
                    keyPointsEnabled={autoKeyPointsEnabled}
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
                    generateDisabled={!transcript || !hasLlmKey || !resolvedSummaryConfig.model}
                    generating={isGenerating}
                    hasLlmKey={hasKey(resolvedPromptAssistantConfig.provider)}
                    onOpenSettings={() => setSettingsOpen(true)}
                    llmProvider={resolvedPromptAssistantConfig.provider}
                    llmApiKey={hasKey(resolvedPromptAssistantConfig.provider) ? (getKey(resolvedPromptAssistantConfig.provider) ?? "") : ""}
                    llmModel={resolvedPromptAssistantConfig.model}
                    llmAzureConfig={azureConfig}
                    llmLangdockConfig={langdockConfig}
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
      </div>{/* end flex-1 */}

      <Footer />

      {/* Step navigation confirmation dialog */}
      <Dialog open={stepNavDialogOpen} onOpenChange={(open) => { if (!open) handleStepNavCancel(); }}>
        <DialogContent className="max-w-sm bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
              {pendingStep === 1 ? "Return to Upload?" : "Return to Transcript?"}
            </DialogTitle>
            <DialogDescription>
              {pendingStep === 1
                ? currentStep === 3
                  ? "Your transcript and generated summary will be cleared. This cannot be undone."
                  : "Your current transcript will be cleared. This cannot be undone."
                : isGenerating
                  ? "Summary generation is currently in progress and will be stopped."
                  : "You'll return to the transcript view. Your summary will be discarded if you regenerate."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={handleStepNavCancel}>
              Cancel
            </Button>
            <Button onClick={handleStepNavConfirm}>
              {pendingStep === 1 ? "Clear & Return" : "Return to Transcript"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Outer shell ──────────────────────────────────────────────────────────────
// Handles the loading / error states.  HomeInner is only mounted once both
// config and preferences have finished loading.  Server preferences are passed
// directly as props so HomeInner's useState initialisers can use them as the
// primary source, with localStorage as fallback.

export default function Home() {
  const { config, loading: configLoading, error: configError, refetch } = useConfig();
  const { setStorageMode, isLoading: prefsLoading, savePreferences, serverPreferences } = usePreferences();

  if (configLoading || prefsLoading) {
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
    <HomeInner
      config={config}
      savePreferences={savePreferences}
      setStorageMode={setStorageMode}
      serverPreferences={serverPreferences}
    />
  );
}
