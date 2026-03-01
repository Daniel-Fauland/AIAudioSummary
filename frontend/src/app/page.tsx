"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { AlertTriangle, Info, Loader2 } from "lucide-react";
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
import { ChatbotFAB } from "@/components/chatbot/ChatbotFAB";
import { ChatbotModal } from "@/components/chatbot/ChatbotModal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTheme } from "next-themes";
import { FormTemplateSelector } from "@/components/form-output/FormTemplateSelector";
import { FormOutputView } from "@/components/form-output/FormOutputView";
import { useConfig } from "@/hooks/useConfig";
import { useApiKeys } from "@/hooks/useApiKeys";
import { useCustomTemplates } from "@/hooks/useCustomTemplates";
import { useFormTemplates } from "@/hooks/useFormTemplates";
import { usePreferences } from "@/hooks/usePreferences";
import { useSessionPersistence } from "@/hooks/useSessionPersistence";
import { useChatbot } from "@/hooks/useChatbot";
import { useTokenUsage } from "@/hooks/useTokenUsage";
import { useGlobalRecording } from "@/contexts/GlobalRecordingContext";
import { useGlobalSync } from "@/contexts/GlobalSyncContext";
import { createTranscript, createSummary, extractKeyPoints, fillForm } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { extractDateFromFilename } from "@/lib/utils";
import { parseConfigString, importSettings, configContainsApiKeys } from "@/lib/config-export";
import type { AzureConfig, LangdockConfig, LLMProvider, SummaryInterval, LLMFeature, FeatureModelOverride, ConfigResponse, AppContext, FormTemplate, FormFieldType, TokenUsage } from "@/lib/types";
import { getContextWindow } from "@/lib/token-utils";
import { APP_VERSION } from "@/lib/constants";
import { changelog } from "@/lib/changelog";

const PENDING_IMPORT_KEY = "aias:pending_import";

const PROVIDER_KEY = "aias:v1:selected_provider";
const MODEL_KEY_PREFIX = "aias:v1:model:";
const AUTO_KEY_POINTS_KEY = "aias:v1:auto_key_points";
const SPEAKER_LABELS_KEY = "aias:v1:speaker_labels";
const MIN_SPEAKERS_KEY = "aias:v1:min_speakers";
const MAX_SPEAKERS_KEY = "aias:v1:max_speakers";
const APP_MODE_KEY = "aias:v1:app_mode";
const REALTIME_INTERVAL_KEY = "aias:v1:realtime_interval";
const REALTIME_FINAL_SUMMARY_KEY = "aias:v1:realtime_final_summary";
const REALTIME_SYSTEM_PROMPT_KEY = "aias:v1:realtime_system_prompt";
const FEATURE_OVERRIDES_KEY = "aias:v1:feature_overrides";
const CHATBOT_ENABLED_KEY = "aias:v1:chatbot_enabled";
const CHATBOT_QA_KEY = "aias:v1:chatbot_qa";
const CHATBOT_TRANSCRIPT_KEY = "aias:v1:chatbot_transcript";
const CHATBOT_ACTIONS_KEY = "aias:v1:chatbot_actions";
const SYNC_STANDARD_REALTIME_KEY = "aias:v1:sync_standard_realtime";
const DEFAULT_COPY_FORMAT_KEY = "aias:v1:default_copy_format";
const DEFAULT_SAVE_FORMAT_KEY = "aias:v1:default_save_format";
const DEFAULT_CHATBOT_COPY_FORMAT_KEY = "aias:v1:default_chatbot_copy_format";

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
  pendingImportConfig?: string;
}

function HomeInner({ config, savePreferences, setStorageMode, serverPreferences, pendingImportConfig }: HomeInnerProps) {
  const { getKey, setKey, hasKey, getAzureConfig, getLangdockConfig, setLangdockConfig } = useApiKeys();
  const { theme, setTheme } = useTheme();
  const globalRecording = useGlobalRecording();
  const globalSync = useGlobalSync();
  const { usageHistory, recordUsage, clearHistory: clearUsageHistory } = useTokenUsage();
  const {
    templates: customTemplates,
    saveTemplate: rawSaveCustomTemplate,
    updateTemplate: rawUpdateCustomTemplate,
    deleteTemplate: rawDeleteCustomTemplate,
  } = useCustomTemplates();

  const saveCustomTemplate = useCallback((name: string, content: string) => {
    const result = rawSaveCustomTemplate(name, content);
    savePreferences();
    return result;
  }, [rawSaveCustomTemplate, savePreferences]);

  const updateCustomTemplate = useCallback((id: string, name: string, content: string) => {
    rawUpdateCustomTemplate(id, name, content);
    savePreferences();
  }, [rawUpdateCustomTemplate, savePreferences]);

  const deleteCustomTemplate = useCallback((id: string) => {
    rawDeleteCustomTemplate(id);
    savePreferences();
  }, [rawDeleteCustomTemplate, savePreferences]);

  // Form templates
  const {
    templates: formTemplates,
    saveTemplate: rawSaveFormTemplate,
    updateTemplate: rawUpdateFormTemplate,
    deleteTemplate: rawDeleteFormTemplate,
  } = useFormTemplates();

  const saveFormTemplate = useCallback((template: FormTemplate) => {
    rawSaveFormTemplate(template);
    savePreferences();
  }, [rawSaveFormTemplate, savePreferences]);

  const updateFormTemplate = useCallback((template: FormTemplate) => {
    rawUpdateFormTemplate(template);
    savePreferences();
  }, [rawUpdateFormTemplate, savePreferences]);

  const deleteFormTemplate = useCallback((id: string) => {
    rawDeleteFormTemplate(id);
    savePreferences();
  }, [rawDeleteFormTemplate, savePreferences]);

  // Session persistence
  const sessionPersistence = useSessionPersistence();
  const initialStandardSession = useMemo(() => sessionPersistence.loadStandardSession(), [sessionPersistence.loadStandardSession]);
  const initialRealtimeSession = useMemo(() => sessionPersistence.loadRealtimeSession(), [sessionPersistence.loadRealtimeSession]);
  const initialChatbotSession = useMemo(() => sessionPersistence.loadChatbotSession(), [sessionPersistence.loadChatbotSession]);

  // Settings panel
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Auto-import from URL
  const pendingImportRef = useRef(!!pendingImportConfig);
  pendingImportRef.current = !!pendingImportConfig;
  const [autoImportDialog, setAutoImportDialog] = useState<{
    configString: string;
    keyCount: number;
    hasApiKeys: boolean;
  } | null>(null);

  useEffect(() => {
    const configString = pendingImportConfig;
    if (!configString) return;

    try {
      const settings = parseConfigString(configString);
      setAutoImportDialog({
        configString,
        keyCount: Object.keys(settings).length,
        hasApiKeys: configContainsApiKeys(settings),
      });
    } catch {
      toast.error("Invalid config string in URL");
      try { localStorage.removeItem(PENDING_IMPORT_KEY); } catch { /* noop */ }
    }
  }, [pendingImportConfig]);

  const handleAutoImportConfirm = useCallback(() => {
    if (!autoImportDialog) return;
    try {
      const count = importSettings(autoImportDialog.configString);
      // Clear pending import so it doesn't re-trigger after reload
      try { localStorage.removeItem(PENDING_IMPORT_KEY); } catch { /* noop */ }
      toast.success(`Imported ${count} setting${count !== 1 ? "s" : ""}. Reloading...`);
      setAutoImportDialog(null);
      setTimeout(() => window.location.replace(window.location.pathname), 500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to import settings");
    }
  }, [autoImportDialog]);

  const handleAutoImportCancel = useCallback(() => {
    setAutoImportDialog(null);
    try { localStorage.removeItem(PENDING_IMPORT_KEY); } catch { /* noop */ }
  }, []);

  // App mode
  const [appMode, setAppMode] = useState<"standard" | "realtime">(
    () => (serverPreferences?.app_mode as "standard" | "realtime") || safeGet(APP_MODE_KEY, "standard") as "standard" | "realtime",
  );

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

  // Workflow state — initialize from persisted session data
  const [currentStep, setCurrentStepRaw] = useState<1 | 2 | 3>(() => {
    // Prefer persisted step (user's last viewed step)
    if (initialStandardSession.currentStep) {
      const step = initialStandardSession.currentStep;
      // Validate: don't restore a step beyond what the data supports
      if (step === 3 && !initialStandardSession.summary && !(initialStandardSession.formValues && Object.keys(initialStandardSession.formValues).length > 0)) {
        // No summary/form data — can't show step 3
        if (initialStandardSession.transcript) return 2;
        return 1;
      }
      if (step === 2 && !initialStandardSession.transcript) {
        return 1;
      }
      return step;
    }
    // Fallback: derive from session data (legacy behaviour for first load)
    if (initialStandardSession.summary || (initialStandardSession.formValues && Object.keys(initialStandardSession.formValues).length > 0)) return 3;
    if (initialStandardSession.transcript) return 2;
    return 1;
  });
  const [maxReachedStep, setMaxReachedStep] = useState<1 | 2 | 3>(() => {
    if (initialStandardSession.summary || (initialStandardSession.formValues && Object.keys(initialStandardSession.formValues).length > 0)) return 3;
    if (initialStandardSession.transcript) return 2;
    return 1;
  });
  // Wrap setCurrentStep to persist step to localStorage (and server via next savePreferences call)
  const setCurrentStep = useCallback((step: 1 | 2 | 3) => {
    setCurrentStepRaw(step);
    sessionPersistence.saveStandardCurrentStep(step);
  }, [sessionPersistence.saveStandardCurrentStep]);

  const [stepNavDialogOpen, setStepNavDialogOpen] = useState(false);
  const [pendingStep, setPendingStep] = useState<1 | 2 | 3 | null>(null);
  const [step1Mode, setStep1Mode] = useState<"upload" | "record">("upload");

  const handleModeChange = useCallback((mode: "standard" | "realtime") => {
    if (mode === "standard" && globalSync.pendingStandardRecordViewRef.current) {
      globalSync.pendingStandardRecordViewRef.current = false;
      setCurrentStep(1);
      setStep1Mode("record");
    }
    setAppMode(mode);
    safeSet(APP_MODE_KEY, mode);
    savePreferences();
  }, [savePreferences, globalSync.pendingStandardRecordViewRef, setCurrentStep]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [transcript, setTranscript] = useState(initialStandardSession.transcript);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [summary, setSummary] = useState(initialStandardSession.summary);
  const [summaryUsage, setSummaryUsage] = useState<TokenUsage | null>(null);
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
  const [speakerLabelsEnabled, setSpeakerLabelsEnabled] = useState(
    () => serverPreferences?.speaker_labels_enabled !== undefined ? serverPreferences.speaker_labels_enabled : safeGet(SPEAKER_LABELS_KEY, "true") !== "false",
  );
  const [suggestedNames, setSuggestedNames] = useState<Record<string, string>>({});
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
  // Chatbot settings
  const [chatbotEnabled, setChatbotEnabled] = useState(
    () => serverPreferences?.chatbot_enabled !== undefined ? serverPreferences.chatbot_enabled : safeGet(CHATBOT_ENABLED_KEY, "true") === "true",
  );
  const [chatbotQAEnabled, setChatbotQAEnabled] = useState(
    () => serverPreferences?.chatbot_qa !== undefined ? serverPreferences.chatbot_qa : safeGet(CHATBOT_QA_KEY, "true") !== "false",
  );
  const [chatbotTranscriptEnabled, setChatbotTranscriptEnabled] = useState(
    () => serverPreferences?.chatbot_transcript !== undefined ? serverPreferences.chatbot_transcript : safeGet(CHATBOT_TRANSCRIPT_KEY, "true") !== "false",
  );
  const [chatbotActionsEnabled, setChatbotActionsEnabled] = useState(
    () => serverPreferences?.chatbot_actions !== undefined ? serverPreferences.chatbot_actions : safeGet(CHATBOT_ACTIONS_KEY, "true") !== "false",
  );
  // Sync Standard + Realtime setting
  const [syncStandardRealtime, setSyncStandardRealtime] = useState(
    () => serverPreferences?.sync_standard_realtime !== undefined ? serverPreferences.sync_standard_realtime : safeGet(SYNC_STANDARD_REALTIME_KEY, "false") === "true",
  );

  // Form output state — initialize from persisted session
  const [outputMode, setOutputMode] = useState<"summary" | "form">(initialStandardSession.outputMode);
  const [selectedFormTemplateId, setSelectedFormTemplateId] = useState<string | null>(initialStandardSession.formTemplateId);
  const [formValues, setFormValues] = useState<Record<string, unknown>>(initialStandardSession.formValues);
  const [isFillingForm, setIsFillingForm] = useState(false);

  // Chatbot UI state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatDraft, setChatDraft] = useState("");
  const [chatbotTranscriptDetached, setChatbotTranscriptDetached] = useState(false);

  // Realtime transcript and connection status for chatbot context
  const [realtimeTranscript, setRealtimeTranscript] = useState("");
  const [realtimeConnectionStatus, setRealtimeConnectionStatus] = useState<"disconnected" | "connecting" | "connected" | "reconnecting" | "error">("disconnected");

  // Transcript available for the current mode (ignoring suspended state)
  const availableTranscript = (() => {
    if (!chatbotTranscriptEnabled) return null;
    if (appMode === "standard" && transcript) return transcript;
    if (appMode === "realtime" && realtimeTranscript) return realtimeTranscript;
    return null;
  })();

  // Actual transcript sent to chatbot (null when suspended)
  const chatbotTranscript = chatbotTranscriptDetached ? null : availableTranscript;

  const isLiveTranscript = appMode === "realtime" && !!availableTranscript;

  const isLiveTranscriptActive =
    isLiveTranscript &&
    (realtimeConnectionStatus === "connected" || realtimeConnectionStatus === "reconnecting");

  // Auto-reattach transcript when content changes
  useEffect(() => {
    if (transcript || realtimeTranscript) {
      setChatbotTranscriptDetached(false);
    }
  }, [transcript, realtimeTranscript]);

  // Persist standard session data to localStorage on changes
  useEffect(() => {
    if (transcript) sessionPersistence.saveStandardTranscript(transcript);
  }, [transcript, sessionPersistence.saveStandardTranscript]);

  useEffect(() => {
    if (summary) sessionPersistence.saveStandardSummary(summary);
  }, [summary, sessionPersistence.saveStandardSummary]);

  useEffect(() => {
    if (Object.keys(formValues).length > 0) sessionPersistence.saveStandardFormValues(formValues);
  }, [formValues, sessionPersistence.saveStandardFormValues]);

  useEffect(() => {
    sessionPersistence.saveStandardFormTemplateId(selectedFormTemplateId);
  }, [selectedFormTemplateId, sessionPersistence.saveStandardFormTemplateId]);

  useEffect(() => {
    sessionPersistence.saveStandardOutputMode(outputMode);
  }, [outputMode, sessionPersistence.saveStandardOutputMode]);

  // Listen for sync-initiated clear events from GlobalSyncContext
  useEffect(() => {
    const handler = () => {
      sessionPersistence.clearStandardSession();
      setSummary("");
      setFormValues({});
      setSelectedFormTemplateId(null);
      setOutputMode("summary");
      savePreferences();
    };
    window.addEventListener("aias:sync-clear-standard", handler);
    return () => window.removeEventListener("aias:sync-clear-standard", handler);
  }, [sessionPersistence.clearStandardSession, savePreferences]);

  const hasAutoExtractedKeyPointsRef = useRef(false);
  // Accumulated speaker renames: original label → new name
  const speakerRenamesRef = useRef<Record<string, string>>({});

  // Global keyboard shortcut: Alt/Option + S to toggle settings
  const settingsOpenRef = useRef(settingsOpen);
  settingsOpenRef.current = settingsOpen;

  // Global keyboard shortcut: Alt/Option + C to toggle chatbot
  const isChatOpenRef = useRef(isChatOpen);
  isChatOpenRef.current = isChatOpen;

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
      if (e.altKey && e.code === "KeyC") {
        e.preventDefault();
        if (isChatOpenRef.current) {
          closeTimeout = setTimeout(() => setIsChatOpen(false), 200);
        } else {
          setIsChatOpen(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(closeTimeout);
    };
  }, []);

  // Set default prompt from first template (once, when config loads)
  const promptInitializedRef = useRef(false);
  useEffect(() => {
    if (config && config.prompt_templates.length > 0 && !promptInitializedRef.current) {
      promptInitializedRef.current = true;
      if (!selectedPrompt) {
        setSelectedPrompt(config.prompt_templates[0].content);
      }
    }
  }, [config]);

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

  const handleSpeakerLabelsChange = useCallback((enabled: boolean) => {
    setSpeakerLabelsEnabled(enabled);
    safeSet(SPEAKER_LABELS_KEY, enabled ? "true" : "false");
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

  const handleChatbotEnabledChange = useCallback((enabled: boolean) => {
    setChatbotEnabled(enabled);
    safeSet(CHATBOT_ENABLED_KEY, enabled ? "true" : "false");
    savePreferences();
  }, [savePreferences]);

  const handleChatbotQAEnabledChange = useCallback((enabled: boolean) => {
    setChatbotQAEnabled(enabled);
    safeSet(CHATBOT_QA_KEY, enabled ? "true" : "false");
    savePreferences();
  }, [savePreferences]);

  const handleChatbotTranscriptEnabledChange = useCallback((enabled: boolean) => {
    setChatbotTranscriptEnabled(enabled);
    safeSet(CHATBOT_TRANSCRIPT_KEY, enabled ? "true" : "false");
    savePreferences();
  }, [savePreferences]);

  const handleChatbotActionsEnabledChange = useCallback((enabled: boolean) => {
    setChatbotActionsEnabled(enabled);
    safeSet(CHATBOT_ACTIONS_KEY, enabled ? "true" : "false");
    savePreferences();
  }, [savePreferences]);

  const handleSyncStandardRealtimeChange = useCallback((enabled: boolean) => {
    setSyncStandardRealtime(enabled);
    safeSet(SYNC_STANDARD_REALTIME_KEY, enabled ? "true" : "false");
    globalSync.setSyncEnabled(enabled);
    savePreferences();
  }, [savePreferences, globalSync]);

  // Default copy/save format state
  const [defaultCopyFormat, setDefaultCopyFormat] = useState<import("@/lib/types").CopyFormat>(
    () => (serverPreferences?.default_copy_format as import("@/lib/types").CopyFormat) || safeGet(DEFAULT_COPY_FORMAT_KEY, "formatted") as import("@/lib/types").CopyFormat,
  );
  const [defaultSaveFormat, setDefaultSaveFormat] = useState<import("@/lib/types").SaveFormat>(
    () => (serverPreferences?.default_save_format as import("@/lib/types").SaveFormat) || safeGet(DEFAULT_SAVE_FORMAT_KEY, "docx") as import("@/lib/types").SaveFormat,
  );

  const handleDefaultCopyFormatChange = useCallback((format: import("@/lib/types").CopyFormat) => {
    setDefaultCopyFormat(format);
    safeSet(DEFAULT_COPY_FORMAT_KEY, format);
    savePreferences();
  }, [savePreferences]);

  const handleDefaultSaveFormatChange = useCallback((format: import("@/lib/types").SaveFormat) => {
    setDefaultSaveFormat(format);
    safeSet(DEFAULT_SAVE_FORMAT_KEY, format);
    savePreferences();
  }, [savePreferences]);

  const [defaultChatbotCopyFormat, setDefaultChatbotCopyFormat] = useState<import("@/lib/types").ChatbotCopyFormat>(
    () => (serverPreferences?.default_chatbot_copy_format as import("@/lib/types").ChatbotCopyFormat) || safeGet(DEFAULT_CHATBOT_COPY_FORMAT_KEY, "formatted") as import("@/lib/types").ChatbotCopyFormat,
  );

  const handleDefaultChatbotCopyFormatChange = useCallback((format: import("@/lib/types").ChatbotCopyFormat) => {
    setDefaultChatbotCopyFormat(format);
    safeSet(DEFAULT_CHATBOT_COPY_FORMAT_KEY, format);
    savePreferences();
  }, [savePreferences]);

  // Keep sync context's AssemblyAI key up to date
  useEffect(() => {
    const key = getKey("assemblyai");
    if (key) globalSync.setAssemblyAiKey(key);
  }, [getKey, globalSync]);

  // Initialize sync enabled state from page-level state into the context
  useEffect(() => {
    globalSync.setSyncEnabled(syncStandardRealtime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chatbot action handlers
  const chatbotActionHandlers = useMemo<Record<string, (params: Record<string, unknown>) => Promise<void>>>(() => ({
    change_theme: async ({ theme }) => {
      const validThemes = ["light", "dark", "system"];
      if (!validThemes.includes(theme as string)) throw new Error(`Invalid theme: ${theme}`);
      setTheme(theme as string);
    },
    switch_app_mode: async ({ mode }) => {
      const validModes = ["standard", "realtime"];
      if (!validModes.includes(mode as string)) throw new Error(`Invalid mode: ${mode}`);
      handleModeChange(mode as "standard" | "realtime");
    },
    change_provider: async ({ provider }) => {
      const validProviders = config?.providers.map(p => p.id) ?? [];
      if (!validProviders.includes(provider as LLMProvider)) throw new Error(`Invalid provider: ${provider}`);
      handleProviderChange(provider as LLMProvider);
    },
    change_model: async ({ model }) => {
      // Validate model exists for the current provider
      const currentProvider = config?.providers.find(p => p.id === selectedProvider);
      if (currentProvider && currentProvider.models.length > 0 && !currentProvider.models.includes(model as string)) {
        throw new Error(`Invalid model "${model}" for provider ${selectedProvider}. Valid models: ${currentProvider.models.join(", ")}`);
      }
      handleModelChange(model as string);
    },
    toggle_sync_mode: async ({ enabled }) => {
      handleSyncStandardRealtimeChange(enabled as boolean);
    },
    toggle_speaker_key_points: async ({ enabled }) => {
      handleAutoKeyPointsChange(enabled as boolean);
    },
    toggle_speaker_labels: async ({ enabled }) => {
      handleSpeakerLabelsChange(enabled as boolean);
    },
    change_speaker_count: async ({ min, max }) => {
      handleMinSpeakersChange(min as number);
      handleMaxSpeakersChange(max as number);
    },
    update_realtime_system_prompt: async ({ prompt }) => {
      if (!prompt || typeof prompt !== "string") throw new Error("System prompt text is required");
      handleRealtimeSystemPromptChange(prompt as string);
    },
    change_realtime_interval: async ({ minutes }) => {
      handleRealtimeSummaryIntervalChange(minutes as number as SummaryInterval);
    },
    toggle_final_summary: async ({ enabled }) => {
      handleRealtimeFinalSummaryEnabledChange(enabled as boolean);
    },
    change_default_copy_format: async ({ format }) => {
      const validFormats: import("@/lib/types").CopyFormat[] = ["formatted", "plain", "markdown", "json"];
      if (!validFormats.includes(format as import("@/lib/types").CopyFormat)) throw new Error(`Invalid copy format: ${format}. Valid formats: ${validFormats.join(", ")}`);
      handleDefaultCopyFormatChange(format as import("@/lib/types").CopyFormat);
    },
    change_default_save_format: async ({ format }) => {
      const validFormats: import("@/lib/types").SaveFormat[] = ["txt", "md", "docx", "pdf", "html", "json"];
      if (!validFormats.includes(format as import("@/lib/types").SaveFormat)) throw new Error(`Invalid save format: ${format}. Valid formats: ${validFormats.join(", ")}`);
      handleDefaultSaveFormatChange(format as import("@/lib/types").SaveFormat);
    },
    change_default_chatbot_copy_format: async ({ format }) => {
      const validFormats: import("@/lib/types").ChatbotCopyFormat[] = ["markdown", "plain", "formatted"];
      if (!validFormats.includes(format as import("@/lib/types").ChatbotCopyFormat)) throw new Error(`Invalid chatbot copy format: ${format}. Valid formats: ${validFormats.join(", ")}`);
      handleDefaultChatbotCopyFormatChange(format as import("@/lib/types").ChatbotCopyFormat);
    },
    open_settings: async () => {
      setSettingsOpen(true);
    },
    update_api_key: async ({ provider, key }) => {
      setKey(provider as LLMProvider | "assemblyai", key as string);
    },
    save_prompt_template: async ({ name, content }) => {
      if (!name || typeof name !== "string") throw new Error("Template name is required");
      if (!content || typeof content !== "string") throw new Error("Template content is required");
      saveCustomTemplate(name, content);
      toast.success(`Prompt template "${name}" saved`);
    },
    list_prompt_templates: async () => {
      if (customTemplates.length === 0) throw new Error("No custom prompt templates found");
    },
    get_prompt_template: async ({ id }) => {
      if (!id || typeof id !== "string") throw new Error("Template ID is required");
      if (!customTemplates.find(t => t.id === id)) throw new Error(`Prompt template with ID "${id}" not found`);
    },
    update_prompt_template: async ({ id, name, content }) => {
      if (!id || typeof id !== "string") throw new Error("Template ID is required");
      if (!customTemplates.find(t => t.id === id)) throw new Error(`Prompt template with ID "${id}" not found`);
      if (!name || typeof name !== "string") throw new Error("Template name is required");
      if (!content || typeof content !== "string") throw new Error("Template content is required");
      updateCustomTemplate(id as string, name as string, content as string);
      toast.success(`Prompt template "${name}" updated`);
    },
    delete_prompt_template: async ({ id }) => {
      if (!id || typeof id !== "string") throw new Error("Template ID is required");
      const template = customTemplates.find(t => t.id === id);
      if (!template) throw new Error(`Prompt template with ID "${id}" not found`);
      deleteCustomTemplate(id as string);
      toast.success(`Prompt template "${template.name}" deleted`);
    },
    save_form_template: async ({ name, fields }) => {
      if (!name || typeof name !== "string") throw new Error("Template name is required");
      if (!Array.isArray(fields) || fields.length === 0) throw new Error("At least one field is required");
      const validTypes: FormFieldType[] = ["string", "number", "date", "boolean", "list_str", "enum", "multi_select"];
      for (const field of fields) {
        const f = field as Record<string, unknown>;
        if (!f.label || typeof f.label !== "string") throw new Error("Each field must have a label");
        if (!validTypes.includes(f.type as FormFieldType)) throw new Error(`Invalid field type: ${f.type}`);
      }
      const template: FormTemplate = {
        id: `form:${Date.now()}`,
        name: name,
        fields: (fields as Record<string, unknown>[]).map((f) => ({
          id: crypto.randomUUID(),
          label: f.label as string,
          type: f.type as FormFieldType,
          description: (f.description as string) || undefined,
          options: Array.isArray(f.options) ? (f.options as string[]) : undefined,
        })),
      };
      saveFormTemplate(template);
      toast.success(`Form template "${name}" saved`);
    },
    list_form_templates: async () => {
      if (formTemplates.length === 0) throw new Error("No custom form templates found");
    },
    get_form_template: async ({ id }) => {
      if (!id || typeof id !== "string") throw new Error("Template ID is required");
      if (!formTemplates.find(t => t.id === id)) throw new Error(`Form template with ID "${id}" not found`);
    },
    update_form_template: async ({ id, name, fields }) => {
      if (!id || typeof id !== "string") throw new Error("Template ID is required");
      if (!formTemplates.find(t => t.id === id)) throw new Error(`Form template with ID "${id}" not found`);
      if (!name || typeof name !== "string") throw new Error("Template name is required");
      if (!Array.isArray(fields) || fields.length === 0) throw new Error("At least one field is required");
      const validTypes: FormFieldType[] = ["string", "number", "date", "boolean", "list_str", "enum", "multi_select"];
      for (const field of fields) {
        const f = field as Record<string, unknown>;
        if (!f.label || typeof f.label !== "string") throw new Error("Each field must have a label");
        if (!validTypes.includes(f.type as FormFieldType)) throw new Error(`Invalid field type: ${f.type}`);
      }
      const template: FormTemplate = {
        id: id as string,
        name: name as string,
        fields: (fields as Record<string, unknown>[]).map((f) => ({
          id: (f.id as string) || crypto.randomUUID(),
          label: f.label as string,
          type: f.type as FormFieldType,
          description: (f.description as string) || undefined,
          options: Array.isArray(f.options) ? (f.options as string[]) : undefined,
        })),
      };
      updateFormTemplate(template);
      toast.success(`Form template "${name}" updated`);
    },
    delete_form_template: async ({ id }) => {
      if (!id || typeof id !== "string") throw new Error("Template ID is required");
      const template = formTemplates.find(t => t.id === id);
      if (!template) throw new Error(`Form template with ID "${id}" not found`);
      deleteFormTemplate(id as string);
      toast.success(`Form template "${template.name}" deleted`);
    },
  }), [setTheme, handleModeChange, handleProviderChange, handleModelChange, handleSyncStandardRealtimeChange, handleAutoKeyPointsChange, handleSpeakerLabelsChange, handleMinSpeakersChange, handleMaxSpeakersChange, handleRealtimeSystemPromptChange, handleRealtimeSummaryIntervalChange, handleRealtimeFinalSummaryEnabledChange, handleDefaultCopyFormatChange, handleDefaultSaveFormatChange, handleDefaultChatbotCopyFormatChange, setKey, config, selectedProvider, saveCustomTemplate, updateCustomTemplate, deleteCustomTemplate, customTemplates, saveFormTemplate, updateFormTemplate, deleteFormTemplate, formTemplates]);

  const getAssemblyAiKey = useCallback((): string | null => {
    const key = getKey("assemblyai");
    return key.trim().length > 0 ? key : null;
  }, [getKey]);

  // Track visit timestamps for the chatbot "what's changed since last visit" feature
  const lastVisitTimestamp = useMemo<string | null>(() => {
    const CURRENT_VISIT_KEY = "aias:v1:current_visit";
    try {
      const previousVisit = localStorage.getItem(CURRENT_VISIT_KEY);
      localStorage.setItem(CURRENT_VISIT_KEY, new Date().toISOString());
      if (previousVisit) {
        return new Date(previousVisit).toLocaleString();
      }
      return null;
    } catch {
      return null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build app context for the chatbot (current settings + version info)
  const chatbotAppContext = useMemo<AppContext>(() => {
    const changelogText = changelog.map(entry =>
      `### v${entry.version} (${entry.date})${entry.title ? ` — ${entry.title}` : ""}\n` +
      entry.changes.map(c => `- **${c.type}**: ${c.description}`).join("\n")
    ).join("\n\n");
    return {
      selected_provider: selectedProvider,
      selected_model: selectedModel,
      app_mode: appMode,
      theme: theme ?? "system",
      app_version: APP_VERSION,
      changelog: changelogText,
      user_timestamp: "",
      last_visit_timestamp: lastVisitTimestamp,
      default_copy_format: defaultCopyFormat,
      default_save_format: defaultSaveFormat,
      default_chatbot_copy_format: defaultChatbotCopyFormat,
      custom_templates: customTemplates.length > 0 ? customTemplates.map(t => ({ id: t.id, name: t.name, content: t.content })) : undefined,
      form_templates: formTemplates.length > 0 ? formTemplates.map(t => ({ id: t.id, name: t.name, fields: t.fields.map(f => ({ label: f.label, type: f.type, description: f.description, options: f.options })) })) : undefined,
    };
  }, [selectedProvider, selectedModel, appMode, theme, lastVisitTimestamp, defaultCopyFormat, defaultSaveFormat, defaultChatbotCopyFormat, customTemplates, formTemplates]);

  const onChatbotMessagesChange = useCallback((msgs: import("@/lib/types").ChatMessageType[]) => {
    if (msgs.length === 0) {
      sessionPersistence.clearChatbotSession();
    } else {
      sessionPersistence.saveChatbotMessages(msgs);
    }
    savePreferences();
  }, [sessionPersistence.saveChatbotMessages, sessionPersistence.clearChatbotSession, savePreferences]);

  const handleChatbotUsage = useCallback((usage: TokenUsage) => {
    const { provider: chatProvider, model: chatModel } = resolveModelConfig("chatbot");
    recordUsage({
      feature: "chatbot",
      provider: chatProvider,
      model: chatModel,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      total_tokens: usage.total_tokens,
    });
  }, [resolveModelConfig, recordUsage]);

  const { messages: chatMessages, isStreaming: isChatStreaming, sendMessage: sendChatMessage, clearMessages: clearChatMessages, hasApiKey: hasChatApiKey, confirmAction: confirmChatAction, cancelAction: cancelChatAction, sessionUsage: chatSessionUsage, lastRequestUsage: chatLastRequestUsage, isVoiceActive: isChatVoiceActive, voiceConnecting: isChatVoiceConnecting, partialTranscript: chatPartialTranscript, voiceText: chatVoiceText, clearVoiceText: clearChatVoiceText, toggleVoice: toggleChatVoice, audioDevices: chatAudioDevices, selectedDeviceId: chatSelectedDeviceId, onDeviceChange: onChatDeviceChange } = useChatbot({
    chatbotQAEnabled,
    chatbotTranscriptEnabled,
    chatbotActionsEnabled,
    selectedProvider,
    selectedModel,
    featureOverrides,
    getKey,
    azureConfig,
    langdockConfig,
    transcript: chatbotTranscript || undefined,
    actionHandlers: chatbotActionsEnabled ? chatbotActionHandlers : undefined,
    hasAssemblyAiKey: hasKey("assemblyai"),
    getAssemblyAiKey,
    appContext: chatbotAppContext,
    isChatOpen,
    chatbotEnabled,
    initialMessages: initialChatbotSession.messages,
    onMessagesChange: onChatbotMessagesChange,
    onUsage: handleChatbotUsage,
  });

  const handleClearChatMessages = useCallback(() => {
    clearChatMessages();
    setChatDraft("");
    sessionPersistence.clearChatbotSession();
    savePreferences();
  }, [clearChatMessages, sessionPersistence.clearChatbotSession, savePreferences]);

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
        // Suppress toast + settings auto-open when an import is pending (e.g. QR code link)
        if (!pendingImportRef.current && !autoImportDialog) {
          toast.error(`Please add your ${kpProvider} API key in Settings.`);
          setSettingsOpen(true);
        }
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
          identify_speakers: speakerLabelsEnabled,
        });
        setSpeakerKeyPoints(applyRenames(result.key_points));
        setSuggestedNames(result.speaker_labels ?? {});
      } catch (e) {
        toast.error(getErrorMessage(e, "keyPoints"));
      } finally {
        setIsExtractingKeyPoints(false);
      }
    },
    [resolveModelConfig, getKey, azureConfig, langdockConfig, applyRenames, speakerLabelsEnabled],
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
      setSuggestedNames({});
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

      // Auto-detect meeting date from filename (e.g. 2024_01_15_standup.mp3)
      const detectedDate = extractDateFromFilename(file.name);
      if (detectedDate) {
        setMeetingDate(detectedDate);
      }

      const assemblyAiKey = getKey("assemblyai");
      if (!assemblyAiKey) {
        toast.error("Please add your AssemblyAI API key in Settings.");
        return;
      }

      // Clear previous session data — new upload replaces everything
      setSummary("");
      setFormValues({});
      setSelectedFormTemplateId(null);
      setOutputMode("summary");
      setSpeakerKeyPoints({});
      setSuggestedNames({});
      setAuthorSpeaker(null);
      hasAutoExtractedKeyPointsRef.current = false;
      speakerRenamesRef.current = {};
      sessionPersistence.clearStandardSession();
      savePreferences();

      setIsUploading(true);
      setCurrentStep(2);
      setMaxReachedStep(2);
      setIsTranscribing(true);

      try {
        const result = await createTranscript(file, assemblyAiKey, undefined, minSpeakers, maxSpeakers);
        setTranscript(result);
        sessionPersistence.saveStandardTranscript(result);
        savePreferences();
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
    [getKey, minSpeakers, maxSpeakers, sessionPersistence.clearStandardSession, savePreferences],
  );

  // Skip upload: go directly to step 2 with empty transcript
  const handleSkipUpload = useCallback(() => {
    // Clear previous session data
    setSummary("");
    setFormValues({});
    setSelectedFormTemplateId(null);
    setOutputMode("summary");
    setSpeakerKeyPoints({});
    setSuggestedNames({});
    setAuthorSpeaker(null);
    hasAutoExtractedKeyPointsRef.current = false;
    speakerRenamesRef.current = {};
    sessionPersistence.clearStandardSession();

    setCurrentStep(2);
    setMaxReachedStep(2);
    setTranscript("");
    setSelectedFile(null);
    savePreferences();
  }, [sessionPersistence.clearStandardSession, setCurrentStep, savePreferences]);

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
    setSummaryUsage(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    let accumulatedSummary = "";

    try {
      const result = await createSummary(
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
          accumulatedSummary += chunk;
          setSummary((prev) => prev + chunk);
        },
        controller.signal,
      );
      // Use cleaned text (usage marker stripped) and capture usage
      if (result.text) {
        accumulatedSummary = result.text;
        setSummary(result.text);
      }
      if (result.usage) {
        setSummaryUsage(result.usage);
        recordUsage({
          feature: "summary_generation",
          provider: summaryProvider,
          model: summaryModel,
          input_tokens: result.usage.input_tokens,
          output_tokens: result.usage.output_tokens,
          total_tokens: result.usage.total_tokens,
        });
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        // User stopped generation — not an error
      } else {
        toast.error(getErrorMessage(e, "summary"));
      }
    } finally {
      abortControllerRef.current = null;
      setIsGenerating(false);
      if (accumulatedSummary) sessionPersistence.saveStandardSummary(accumulatedSummary);
      savePreferences();
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
    savePreferences,
  ]);

  const handleStopGenerating = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const handleRegenerate = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  const handleBackToTranscript = useCallback(() => {
    setCurrentStep(2);
    savePreferences();
  }, [setCurrentStep, savePreferences]);

  const handleShowPreviousOutput = useCallback(() => {
    setCurrentStep(3);
    setMaxReachedStep((prev) => Math.max(prev, 3) as 1 | 2 | 3);
    savePreferences();
  }, [setCurrentStep, savePreferences]);

  const handleStartOver = useCallback(() => {
    abortControllerRef.current?.abort();
    setCurrentStep(1);
    setSelectedFile(null);
    setIsGenerating(false);
    setIsTranscribing(false);
    savePreferences();
    // Keep transcript/summary/form in state and storage — data persists until a new file is uploaded
  }, [setCurrentStep, savePreferences]);

  const handleStepClick = useCallback(
    (step: 1 | 2 | 3) => {
      if (step === currentStep) return;
      if (step > maxReachedStep) return;
      // Navigating forward (e.g. step 2 → 3 to view previous results) — go directly
      if (step > currentStep) {
        setCurrentStep(step);
        savePreferences();
        return;
      }
      // Navigating backward to step 1 — go directly (data is persisted)
      if (step === 1 && currentStep > 1) {
        abortControllerRef.current?.abort();
        setCurrentStep(1);
        setSelectedFile(null);
        setIsGenerating(false);
        setIsTranscribing(false);
        savePreferences();
        return;
      }
      // Navigating backward to step 2 while generating — show confirmation
      if (step === 2 && currentStep === 3 && isGenerating) {
        setPendingStep(step);
        setStepNavDialogOpen(true);
        return;
      }
      // Otherwise go directly (e.g. step 3 → 2 with no generation in progress)
      setCurrentStep(step);
      savePreferences();
    },
    [currentStep, maxReachedStep, isGenerating, setCurrentStep, savePreferences],
  );

  const handleStepNavConfirm = useCallback(() => {
    if (pendingStep === null) return;
    if (pendingStep === 2) {
      abortControllerRef.current?.abort();
      setIsGenerating(false);
      setCurrentStep(2);
      savePreferences();
    }
    setStepNavDialogOpen(false);
    setPendingStep(null);
  }, [pendingStep, setCurrentStep, savePreferences]);

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
  const resolvedFormOutputConfig =
    featureOverrides["form_output"] ?? { provider: selectedProvider, model: selectedModel };

  const hasLlmKey = hasKey(resolvedSummaryConfig.provider);
  const hasAssemblyAiKey = hasKey("assemblyai");
  const hasFormOutputKey = hasKey(resolvedFormOutputConfig.provider);

  // Form output handler
  const handleFillForm = useCallback(async () => {
    const template = formTemplates.find((t) => t.id === selectedFormTemplateId);
    if (!template) return;

    const llmKey = getKey(resolvedFormOutputConfig.provider);
    if (!llmKey) {
      toast.error(`Please add your ${resolvedFormOutputConfig.provider} API key in Settings.`);
      setSettingsOpen(true);
      return;
    }

    setCurrentStep(3);
    setMaxReachedStep((prev) => Math.max(prev, 3) as 1 | 2 | 3);
    setIsFillingForm(true);

    try {
      const response = await fillForm({
        provider: resolvedFormOutputConfig.provider,
        api_key: llmKey,
        model: resolvedFormOutputConfig.model,
        azure_config: resolvedFormOutputConfig.provider === "azure_openai" ? azureConfig ?? undefined : undefined,
        langdock_config: resolvedFormOutputConfig.provider === "langdock" ? langdockConfig : undefined,
        transcript,
        fields: template.fields,
        meeting_date: meetingDate ?? undefined,
      });
      setFormValues(response.values);
      sessionPersistence.saveStandardFormValues(response.values);
    } catch (e) {
      toast.error(getErrorMessage(e, "formOutput"));
    } finally {
      setIsFillingForm(false);
      savePreferences();
    }
  }, [formTemplates, selectedFormTemplateId, resolvedFormOutputConfig, getKey, azureConfig, langdockConfig, transcript, meetingDate, savePreferences]);

  const handleFormManualEdit = useCallback((fieldId: string, value: unknown) => {
    setFormValues((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const handleFormRefill = useCallback(async () => {
    const template = formTemplates.find((t) => t.id === selectedFormTemplateId);
    if (!template) return;

    const llmKey = getKey(resolvedFormOutputConfig.provider);
    if (!llmKey) {
      toast.error(`Please add your ${resolvedFormOutputConfig.provider} API key in Settings.`);
      setSettingsOpen(true);
      return;
    }

    setIsFillingForm(true);

    try {
      const response = await fillForm({
        provider: resolvedFormOutputConfig.provider,
        api_key: llmKey,
        model: resolvedFormOutputConfig.model,
        azure_config: resolvedFormOutputConfig.provider === "azure_openai" ? azureConfig ?? undefined : undefined,
        langdock_config: resolvedFormOutputConfig.provider === "langdock" ? langdockConfig : undefined,
        transcript,
        fields: template.fields,
        previous_values: formValues,
        meeting_date: meetingDate ?? undefined,
      });
      setFormValues(response.values);
      sessionPersistence.saveStandardFormValues(response.values);
    } catch (e) {
      toast.error(getErrorMessage(e, "formOutput"));
    } finally {
      setIsFillingForm(false);
      savePreferences();
    }
  }, [formTemplates, selectedFormTemplateId, resolvedFormOutputConfig, getKey, azureConfig, langdockConfig, transcript, formValues, meetingDate, savePreferences]);

  const handleRealtimeSummaryUsage = useCallback((usage: TokenUsage) => {
    recordUsage({
      feature: "realtime_summary",
      provider: resolvedRealtimeConfig.provider,
      model: resolvedRealtimeConfig.model,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      total_tokens: usage.total_tokens,
    });
  }, [recordUsage, resolvedRealtimeConfig.provider, resolvedRealtimeConfig.model]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1">
      <Header onSettingsClick={() => setSettingsOpen(true)} onStorageModeChange={setStorageMode} usageHistory={usageHistory} onClearUsageHistory={clearUsageHistory} />

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
        speakerLabelsEnabled={speakerLabelsEnabled}
        onSpeakerLabelsChange={handleSpeakerLabelsChange}
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
        chatbotEnabled={chatbotEnabled}
        onChatbotEnabledChange={handleChatbotEnabledChange}
        chatbotQAEnabled={chatbotQAEnabled}
        onChatbotQAEnabledChange={handleChatbotQAEnabledChange}
        chatbotTranscriptEnabled={chatbotTranscriptEnabled}
        onChatbotTranscriptEnabledChange={handleChatbotTranscriptEnabledChange}
        chatbotActionsEnabled={chatbotActionsEnabled}
        onChatbotActionsEnabledChange={handleChatbotActionsEnabledChange}
        syncStandardRealtime={syncStandardRealtime}
        onSyncStandardRealtimeChange={handleSyncStandardRealtimeChange}
        defaultCopyFormat={defaultCopyFormat}
        onDefaultCopyFormatChange={handleDefaultCopyFormatChange}
        defaultSaveFormat={defaultSaveFormat}
        onDefaultSaveFormatChange={handleDefaultSaveFormatChange}
        defaultChatbotCopyFormat={defaultChatbotCopyFormat}
        onDefaultChatbotCopyFormatChange={handleDefaultChatbotCopyFormatChange}
      />

      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        {/* Mode segmented control */}
        <div className="flex justify-center mt-4 mb-4">
          <div className="inline-flex rounded-lg border border-border bg-card-elevated p-1">
            <button
              type="button"
              onClick={() => handleModeChange("standard")}
              className={`relative rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                appMode === "standard"
                  ? "bg-primary text-primary-foreground"
                  : "bg-transparent text-foreground-secondary hover:text-foreground"
              }`}
            >
              Standard
              {appMode !== "standard" && (globalRecording.recorderState === "recording" || globalRecording.recorderState === "paused") && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 animate-pulse rounded-full bg-destructive" />
              )}
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("realtime")}
              className={`relative rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                appMode === "realtime"
                  ? "bg-primary text-primary-foreground"
                  : "bg-transparent text-foreground-secondary hover:text-foreground"
              }`}
            >
              Realtime
              {appMode !== "realtime" && (realtimeConnectionStatus === "connected" || realtimeConnectionStatus === "reconnecting") && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 animate-pulse rounded-full bg-primary" />
              )}
            </button>
          </div>
        </div>

        {/* Realtime mode — always mounted so WebSocket stays alive during mode switches */}
        <div className={appMode === "realtime" ? "step-content space-y-6 pb-8" : "hidden"}>
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
            onTranscriptChange={setRealtimeTranscript}
            onConnectionStatusChange={setRealtimeConnectionStatus}
            formOutputProvider={resolvedFormOutputConfig.provider}
            formOutputModel={resolvedFormOutputConfig.model}
            formOutputApiKey={getKey(resolvedFormOutputConfig.provider)}
            formOutputAzureConfig={azureConfig}
            formOutputLangdockConfig={langdockConfig}
            formTemplates={formTemplates}
            onSaveFormTemplate={saveFormTemplate}
            onUpdateFormTemplate={updateFormTemplate}
            onDeleteFormTemplate={deleteFormTemplate}
            initialRealtimeSession={initialRealtimeSession}
            onPersistTranscript={sessionPersistence.saveRealtimeTranscript}
            onPersistSummary={sessionPersistence.saveRealtimeSummary}
            onPersistQuestions={sessionPersistence.saveRealtimeQuestions}
            onPersistFormValues={sessionPersistence.saveRealtimeFormValues}
            onPersistFormTemplateId={sessionPersistence.saveRealtimeFormTemplateId}
            onClearRealtimeSession={sessionPersistence.clearRealtimeSession}
            onSavePreferences={savePreferences}
            onSummaryUsage={handleRealtimeSummaryUsage}
          />
        </div>

        {/* Standard mode — always mounted so recording persists during mode switches */}
        <div className={appMode === "standard" ? "step-content-wrapper" : "hidden"}>
        <StepIndicator
          currentStep={currentStep}
          maxReachedStep={maxReachedStep}
          onStepClick={handleStepClick}
        />

        <div className="step-content space-y-6 pb-8">
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

              {transcript && (
                <button
                  type="button"
                  onClick={() => { setCurrentStep(2); savePreferences(); }}
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  Show previous transcript
                </button>
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
                    suggestedNames={suggestedNames}
                  />

                  {/* Output mode toggle */}
                  <div className="flex justify-center">
                    <div className="inline-flex rounded-lg border border-border bg-card-elevated p-1">
                      <button
                        type="button"
                        onClick={() => { setOutputMode("summary"); sessionPersistence.saveStandardOutputMode("summary"); savePreferences(); }}
                        className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                          outputMode === "summary"
                            ? "bg-primary text-primary-foreground"
                            : "bg-transparent text-foreground-secondary hover:text-foreground"
                        }`}
                      >
                        Summary
                      </button>
                      <button
                        type="button"
                        onClick={() => { setOutputMode("form"); sessionPersistence.saveStandardOutputMode("form"); savePreferences(); }}
                        className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                          outputMode === "form"
                            ? "bg-primary text-primary-foreground"
                            : "bg-transparent text-foreground-secondary hover:text-foreground"
                        }`}
                      >
                        Form Output
                      </button>
                    </div>
                  </div>

                  {outputMode === "summary" ? (
                    <>
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
                      {summary && (
                        <button
                          type="button"
                          onClick={handleShowPreviousOutput}
                          className="text-sm text-primary hover:text-primary/80 transition-colors"
                        >
                          Show previous summary
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <FormTemplateSelector
                        templates={formTemplates}
                        selectedTemplateId={selectedFormTemplateId}
                        onSelectTemplate={setSelectedFormTemplateId}
                        onSaveTemplate={saveFormTemplate}
                        onUpdateTemplate={updateFormTemplate}
                        onDeleteTemplate={deleteFormTemplate}
                        onFillForm={handleFillForm}
                        fillDisabled={!transcript || !hasFormOutputKey || !resolvedFormOutputConfig.model}
                        isFilling={isFillingForm}
                        meetingDate={meetingDate}
                        onMeetingDateChange={setMeetingDate}
                        llmProvider={resolvedFormOutputConfig.provider}
                        llmApiKey={getKey(resolvedFormOutputConfig.provider)}
                        llmModel={resolvedFormOutputConfig.model}
                        llmAzureConfig={azureConfig}
                        llmLangdockConfig={langdockConfig}
                      />
                      {Object.keys(formValues).length > 0 && (
                        <button
                          type="button"
                          onClick={handleShowPreviousOutput}
                          className="text-sm text-primary hover:text-primary/80 transition-colors"
                        >
                          Show previous form output
                        </button>
                      )}
                    </>
                  )}

                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={handleStartOver}>
                      Start Over
                    </Button>
                  </div>
                </>
              ) : null}
            </>
          ) : null}

          {/* Step 3: Summary or Form Output (side-by-side with transcript) */}
          {currentStep === 3 ? (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <TranscriptView transcript={transcript} onTranscriptChange={setTranscript} readOnly />
                {outputMode === "summary" ? (
                  <SummaryView
                    summary={summary}
                    loading={isGenerating}
                    onStop={handleStopGenerating}
                    onRegenerate={handleRegenerate}
                    onBack={handleBackToTranscript}
                    tokenUsage={summaryUsage}
                    contextWindow={getContextWindow(config, resolveModelConfig("summary_generation").provider, resolveModelConfig("summary_generation").model)}
                  />
                ) : (
                  <FormOutputView
                    templateName={formTemplates.find((t) => t.id === selectedFormTemplateId)?.name ?? "Form Output"}
                    fields={formTemplates.find((t) => t.id === selectedFormTemplateId)?.fields ?? []}
                    values={formValues}
                    isFilling={isFillingForm}
                    onManualEdit={handleFormManualEdit}
                    onRefill={handleFormRefill}
                    onBack={handleBackToTranscript}
                    refillDisabled={!transcript || !hasFormOutputKey || !resolvedFormOutputConfig.model}
                  />
                )}
              </div>
              {!isGenerating && !isFillingForm ? (
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
      </div>{/* end flex-1 */}

      <Footer />

      {chatbotEnabled && (
        <>
          <ChatbotFAB
            onClick={() => setIsChatOpen(true)}
            isOpen={isChatOpen}
            isSettingsOpen={settingsOpen}
          />
          <ChatbotModal
            open={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            messages={chatMessages}
            isStreaming={isChatStreaming}
            hasApiKey={hasChatApiKey}
            onSendMessage={sendChatMessage}
            onClearMessages={handleClearChatMessages}
            onOpenSettings={() => setSettingsOpen(true)}
            transcriptAttached={!!availableTranscript}
            transcriptSuspended={chatbotTranscriptDetached && !!availableTranscript}
            transcriptWordCount={availableTranscript ? availableTranscript.split(/\s+/).filter(Boolean).length : 0}
            isLiveTranscript={isLiveTranscript}
            isLiveTranscriptActive={isLiveTranscriptActive}
            onDetachTranscript={() => setChatbotTranscriptDetached(true)}
            onReattachTranscript={() => setChatbotTranscriptDetached(false)}
            onConfirmAction={confirmChatAction}
            onCancelAction={cancelChatAction}
            isVoiceActive={isChatVoiceActive}
            partialTranscript={chatPartialTranscript}
            voiceText={chatVoiceText}
            onClearVoiceText={clearChatVoiceText}
            onVoiceToggle={toggleChatVoice}
            voiceDisabled={!hasKey("assemblyai") || isChatVoiceConnecting}
            voiceDisabledReason={!hasKey("assemblyai") ? "AssemblyAI API key required for voice input" : isChatVoiceConnecting ? "Connecting voice service..." : undefined}
            audioDevices={chatAudioDevices}
            selectedDeviceId={chatSelectedDeviceId}
            onDeviceChange={onChatDeviceChange}
            isSettingsOpen={settingsOpen}
            chatDraft={chatDraft}
            onChatDraftChange={setChatDraft}
            sessionUsage={chatSessionUsage}
            lastRequestUsage={chatLastRequestUsage}
            contextWindow={getContextWindow(config, resolveModelConfig("chatbot").provider, resolveModelConfig("chatbot").model)}
            chatbotCopyFormat={defaultChatbotCopyFormat}
          />
        </>
      )}

      {/* Step navigation confirmation dialog */}
      <Dialog open={stepNavDialogOpen} onOpenChange={(open) => { if (!open) handleStepNavCancel(); }}>
        <DialogContent className="max-w-sm bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
              Return to Transcript?
            </DialogTitle>
            <DialogDescription>
              {isGenerating
                ? "Summary generation is currently in progress and will be stopped."
                : "You'll return to the transcript view. Your summary will be discarded if you regenerate."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={handleStepNavCancel}>
              Cancel
            </Button>
            <Button onClick={handleStepNavConfirm}>
              Return to Transcript
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto-import confirmation dialog */}
      <Dialog open={!!autoImportDialog} onOpenChange={(open) => { if (!open) handleAutoImportCancel(); }}>
        <DialogContent className="max-w-sm bg-card">
          <DialogHeader>
            <DialogTitle>Import Settings</DialogTitle>
            <DialogDescription>
              Settings were received via a shared link. Would you like to import them?
            </DialogDescription>
          </DialogHeader>
          {autoImportDialog ? (
            <div className="space-y-2">
              <div className="flex items-start gap-2 rounded-md border border-border bg-card-elevated p-3">
                <Info className="h-4 w-4 shrink-0 text-foreground-muted mt-0.5" />
                <div className="text-xs text-foreground-secondary space-y-1">
                  <p>
                    Ready to import{" "}
                    <strong className="text-foreground">
                      {autoImportDialog.keyCount} setting{autoImportDialog.keyCount !== 1 ? "s" : ""}
                    </strong>
                  </p>
                  {autoImportDialog.hasApiKeys ? (
                    <p className="text-warning">
                      This config includes API keys which will overwrite your current keys.
                    </p>
                  ) : null}
                </div>
              </div>
              <p className="text-xs text-foreground-muted">
                Existing settings with matching keys will be overwritten. The page will reload after import.
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={handleAutoImportCancel}>
              Cancel
            </Button>
            <Button onClick={handleAutoImportConfirm}>
              Import Settings
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

  // Detect ?import= URL parameter and persist it for after-login import
  const [pendingImportConfig, setPendingImportConfig] = useState<string | undefined>(undefined);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const importParam = params.get("import");
    if (importParam) {
      // Clean the URL immediately so the config string isn't visible
      window.history.replaceState({}, "", window.location.pathname);
      // Store in localStorage so it survives the login redirect
      try { localStorage.setItem(PENDING_IMPORT_KEY, importParam); } catch { /* noop */ }
      setPendingImportConfig(importParam);
    } else {
      // Check for a previously-stored pending import (e.g. after login redirect)
      try {
        const stored = localStorage.getItem(PENDING_IMPORT_KEY);
        if (stored) {
          localStorage.removeItem(PENDING_IMPORT_KEY);
          setPendingImportConfig(stored);
        }
      } catch { /* noop */ }
    }
  }, []);

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
      pendingImportConfig={pendingImportConfig}
    />
  );
}
