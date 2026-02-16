"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Header } from "@/components/layout/Header";
import { StepIndicator } from "@/components/layout/StepIndicator";
import { SettingsSheet } from "@/components/layout/SettingsSheet";
import { FileUpload } from "@/components/workflow/FileUpload";
import { TranscriptView } from "@/components/workflow/TranscriptView";
import { SpeakerMapper } from "@/components/workflow/SpeakerMapper";
import { PromptEditor } from "@/components/workflow/PromptEditor";
import { SummaryView } from "@/components/workflow/SummaryView";
import { Button } from "@/components/ui/button";
import { useConfig } from "@/hooks/useConfig";
import { useApiKeys } from "@/hooks/useApiKeys";
import { useCustomTemplates } from "@/hooks/useCustomTemplates";
import { createTranscript, createSummary } from "@/lib/api";
import type { AzureConfig, LLMProvider } from "@/lib/types";

const PROVIDER_KEY = "aias:v1:selected_provider";
const MODEL_KEY_PREFIX = "aias:v1:model:";

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

  // Provider / model (persisted in localStorage)
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>(() =>
    safeGet(PROVIDER_KEY, "openai") as LLMProvider,
  );
  const [selectedModel, setSelectedModel] = useState<string>(() =>
    safeGet(`${MODEL_KEY_PREFIX}${safeGet(PROVIDER_KEY, "openai")}`, "gpt-5.2"),
  );
  const [azureConfig, setAzureConfig] = useState<AzureConfig | null>(() =>
    getAzureConfig(),
  );

  // Workflow state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
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
      const defaultModel =
        safeGet(`${MODEL_KEY_PREFIX}${provider}`, "") ||
        providerInfo?.models[0] ||
        "";
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

      try {
        const result = await createTranscript(file, assemblyAiKey);
        setTranscript(result);
        toast.success("Transcription complete!");
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Transcription failed",
        );
        setCurrentStep(1);
        setSelectedFile(null);
      } finally {
        setIsUploading(false);
        setIsTranscribing(false);
      }
    },
    [getKey],
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
      toast.error(
        `Please add your ${selectedProvider} API key in Settings.`,
      );
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
          azure_config:
            selectedProvider === "azure_openai" ? azureConfig : null,
          stream: true,
          system_prompt: selectedPrompt,
          text: transcript,
          target_language: selectedLanguage,
          informal_german: informalGerman,
          date: meetingDate,
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
        toast.error(
          e instanceof Error ? e.message : "Summary generation failed",
        );
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
    setIsGenerating(false);
    setIsTranscribing(false);
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
              <div
                key={i}
                className="h-10 w-10 animate-pulse rounded-full bg-card-elevated"
              />
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
          <p className="text-xs text-foreground-muted">
            Make sure the backend is running and reachable
          </p>
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
      />

      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <StepIndicator currentStep={currentStep} />

        <div className="step-content space-y-6 pb-8" key={currentStep}>
          {/* Step 1: File Upload */}
          {currentStep === 1 ? (
            <FileUpload
              onFileSelected={handleFileSelected}
              onSkipUpload={handleSkipUpload}
              onOpenSettings={() => setSettingsOpen(true)}
              disabled={isUploading}
              uploading={isUploading}
              hasAssemblyAiKey={hasAssemblyAiKey}
            />
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
                      Upload New File
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
                <TranscriptView
                  transcript={transcript}
                  onTranscriptChange={setTranscript}
                  readOnly
                />
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
      </div>
    </div>
  );
}
