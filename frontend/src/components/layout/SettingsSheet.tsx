"use client";

import { useState, useCallback, useEffect } from "react";
import { ChevronDown, ClipboardPaste, Eye, EyeOff, Info, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiKeyManager } from "@/components/settings/ApiKeyManager";
import { ProviderSelector } from "@/components/settings/ProviderSelector";
import { ModelSelector } from "@/components/settings/ModelSelector";
import { AzureConfigForm } from "@/components/settings/AzureConfigForm";
import { LangdockConfigForm } from "@/components/settings/LangdockConfigForm";
import { FeatureModelOverrides } from "@/components/settings/FeatureModelOverrides";
import { ChatbotSettings } from "@/components/settings/ChatbotSettings";
import { KeytermsListSelector } from "@/components/settings/KeytermsListSelector";
import type { AzureConfig, LangdockConfig, ConfigResponse, LLMProvider, RealtimeSpeechModel, SummaryInterval, LLMFeature, FeatureModelOverride, CopyFormat, SaveFormat, ChatbotCopyFormat, KeytermsList, WebhookStandardTrigger, WebhookRealtimeTrigger } from "@/lib/types";
import { COPY_FORMAT_LABELS, SAVE_FORMAT_LABELS, CHATBOT_COPY_FORMAT_LABELS } from "@/lib/content-formats";

interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: ConfigResponse | null;
  selectedProvider: LLMProvider;
  onProviderChange: (provider: LLMProvider) => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  azureConfig: AzureConfig | null;
  onAzureConfigChange: (config: AzureConfig) => void;
  langdockConfig: LangdockConfig;
  onLangdockConfigChange: (config: LangdockConfig) => void;
  autoKeyPointsEnabled: boolean;
  onAutoKeyPointsChange: (enabled: boolean) => void;
  speakerLabelsEnabled: boolean;
  onSpeakerLabelsChange: (enabled: boolean) => void;
  minSpeakers: number;
  onMinSpeakersChange: (value: number) => void;
  maxSpeakers: number;
  onMaxSpeakersChange: (value: number) => void;
  realtimeSummaryInterval: SummaryInterval;
  onRealtimeSummaryIntervalChange: (interval: SummaryInterval) => void;
  realtimeFinalSummaryEnabled: boolean;
  onRealtimeFinalSummaryEnabledChange: (enabled: boolean) => void;
  realtimeReevaluateAll: boolean;
  onRealtimeReevaluateAllChange: (enabled: boolean) => void;
  realtimeSystemPrompt: string;
  onRealtimeSystemPromptChange: (prompt: string) => void;
  defaultRealtimeSystemPrompt: string;
  featureOverrides: Partial<Record<LLMFeature, FeatureModelOverride>>;
  onFeatureOverridesChange: (overrides: Partial<Record<LLMFeature, FeatureModelOverride>>) => void;
  chatbotEnabled: boolean;
  onChatbotEnabledChange: (enabled: boolean) => void;
  chatbotQAEnabled: boolean;
  onChatbotQAEnabledChange: (enabled: boolean) => void;
  chatbotTranscriptEnabled: boolean;
  onChatbotTranscriptEnabledChange: (enabled: boolean) => void;
  chatbotActionsEnabled: boolean;
  onChatbotActionsEnabledChange: (enabled: boolean) => void;
  syncStandardRealtime: boolean;
  onSyncStandardRealtimeChange: (enabled: boolean) => void;
  defaultCopyFormat: CopyFormat;
  onDefaultCopyFormatChange: (format: CopyFormat) => void;
  defaultSaveFormat: SaveFormat;
  onDefaultSaveFormatChange: (format: SaveFormat) => void;
  defaultChatbotCopyFormat: ChatbotCopyFormat;
  onDefaultChatbotCopyFormatChange: (format: ChatbotCopyFormat) => void;
  advancedSettings: boolean;
  onAdvancedSettingsChange: (enabled: boolean) => void;
  showStandardTimestamps: boolean;
  onShowStandardTimestampsChange: (enabled: boolean) => void;
  realtimeSpeechModel: RealtimeSpeechModel;
  onRealtimeSpeechModelChange: (model: RealtimeSpeechModel) => void;
  keytermsLists: KeytermsList[];
  selectedKeytermsListId: string | null;
  onKeytermsListChange: (id: string | null) => void;
  onSaveKeytermsList: (list: KeytermsList) => void;
  onUpdateKeytermsList: (list: KeytermsList) => void;
  onDeleteKeytermsList: (id: string) => void;
  webhookUrl: string;
  onWebhookUrlChange: (url: string) => void;
  webhookSecret: string;
  onWebhookSecretChange: (secret: string) => void;
  webhookStandardTrigger: WebhookStandardTrigger;
  onWebhookStandardTriggerChange: (trigger: WebhookStandardTrigger) => void;
  webhookRealtimeTrigger: WebhookRealtimeTrigger;
  onWebhookRealtimeTriggerChange: (trigger: WebhookRealtimeTrigger) => void;
  webhookUserArgs: { key: string; value: string }[];
  onWebhookUserArgsChange: (args: { key: string; value: string }[]) => void;
  displayName: string;
  onDisplayNameChange: (name: string) => void;
  onResetSettings: () => void;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <CollapsibleTrigger className="flex w-full items-center justify-between group">
      <h3 className="text-sm font-medium text-foreground-secondary">{children}</h3>
      <ChevronDown className="h-4 w-4 text-foreground-muted transition-transform group-data-[state=closed]:-rotate-90" />
    </CollapsibleTrigger>
  );
}

function readSection(key: string, fallback: boolean): boolean {
  try {
    const val = localStorage.getItem(key);
    return val === null ? fallback : val === "true";
  } catch {
    return fallback;
  }
}

function writeSection(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // ignore
  }
}

export function SettingsSheet({
  open,
  onOpenChange,
  config,
  selectedProvider,
  onProviderChange,
  selectedModel,
  onModelChange,
  azureConfig,
  onAzureConfigChange,
  langdockConfig,
  onLangdockConfigChange,
  autoKeyPointsEnabled,
  onAutoKeyPointsChange,
  speakerLabelsEnabled,
  onSpeakerLabelsChange,
  minSpeakers,
  onMinSpeakersChange,
  maxSpeakers,
  onMaxSpeakersChange,
  realtimeSummaryInterval,
  onRealtimeSummaryIntervalChange,
  realtimeFinalSummaryEnabled,
  onRealtimeFinalSummaryEnabledChange,
  realtimeReevaluateAll,
  onRealtimeReevaluateAllChange,
  realtimeSystemPrompt,
  onRealtimeSystemPromptChange,
  defaultRealtimeSystemPrompt,
  featureOverrides,
  onFeatureOverridesChange,
  chatbotEnabled,
  onChatbotEnabledChange,
  chatbotQAEnabled,
  onChatbotQAEnabledChange,
  chatbotTranscriptEnabled,
  onChatbotTranscriptEnabledChange,
  chatbotActionsEnabled,
  onChatbotActionsEnabledChange,
  syncStandardRealtime,
  onSyncStandardRealtimeChange,
  defaultCopyFormat,
  onDefaultCopyFormatChange,
  defaultSaveFormat,
  onDefaultSaveFormatChange,
  defaultChatbotCopyFormat,
  onDefaultChatbotCopyFormatChange,
  advancedSettings,
  onAdvancedSettingsChange,
  showStandardTimestamps,
  onShowStandardTimestampsChange,
  realtimeSpeechModel,
  onRealtimeSpeechModelChange,
  keytermsLists,
  selectedKeytermsListId,
  onKeytermsListChange,
  onSaveKeytermsList,
  onUpdateKeytermsList,
  onDeleteKeytermsList,
  displayName,
  onDisplayNameChange,
  webhookUrl,
  onWebhookUrlChange,
  webhookSecret,
  onWebhookSecretChange,
  webhookStandardTrigger,
  onWebhookStandardTriggerChange,
  webhookRealtimeTrigger,
  onWebhookRealtimeTriggerChange,
  webhookUserArgs,
  onWebhookUserArgsChange,
  onResetSettings,
}: SettingsSheetProps) {
  const providers = config?.providers ?? [];
  const currentProvider = providers.find((p) => p.id === selectedProvider);
  const [keyVersion, setKeyVersion] = useState(0);
  const handleKeyChange = useCallback(() => {
    setKeyVersion((v) => v + 1);
  }, []);

  const [minSpeakersInput, setMinSpeakersInput] = useState(String(minSpeakers));
  const [maxSpeakersInput, setMaxSpeakersInput] = useState(String(maxSpeakers));

  useEffect(() => { setMinSpeakersInput(String(minSpeakers)); }, [minSpeakers]);
  useEffect(() => { setMaxSpeakersInput(String(maxSpeakers)); }, [maxSpeakers]);

  const [apiKeysOpen, setApiKeysOpen] = useState(() => readSection("aias:v1:settings:section:apiKeys", true));
  const [aiModelOpen, setAiModelOpen] = useState(() => readSection("aias:v1:settings:section:aiModel", true));
  const [featuresOpen, setFeaturesOpen] = useState(() =>
    readSection("aias:v1:settings:section:features", true),
  );

  const handleApiKeysOpen = (value: boolean) => {
    setApiKeysOpen(value);
    writeSection("aias:v1:settings:section:apiKeys", value);
  };
  const handleAiModelOpen = (value: boolean) => {
    setAiModelOpen(value);
    writeSection("aias:v1:settings:section:aiModel", value);
  };
  const handleFeaturesOpen = (value: boolean) => {
    setFeaturesOpen(value);
    writeSection("aias:v1:settings:section:features", value);
  };
  const [webhooksOpen, setWebhooksOpen] = useState(() => readSection("aias:v1:settings:section:webhooks", false));
  const handleWebhooksOpen = (value: boolean) => {
    setWebhooksOpen(value);
    writeSection("aias:v1:settings:section:webhooks", value);
  };
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  // Keyboard shortcut indicators
  const [altPressed, setAltPressed] = useState(false);
  const [sPressed, setSPressed] = useState(false);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Alt") setAltPressed(true);
      if (e.code === "KeyS") setSPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Alt") setAltPressed(false);
      if (e.code === "KeyS") setSPressed(false);
    };
    const handleBlur = () => {
      setAltPressed(false);
      setSPressed(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [open]);

  // Reset confirmation
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // System prompt editor state
  const [promptEditorOpen, setPromptEditorOpen] = useState(false);
  const [promptDraft, setPromptDraft] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const openPromptEditor = () => {
    setPromptDraft(realtimeSystemPrompt || defaultRealtimeSystemPrompt);
    setPromptEditorOpen(true);
  };

  const savePrompt = () => {
    onRealtimeSystemPromptChange(promptDraft);
    setPromptEditorOpen(false);
  };

  const cancelPrompt = () => {
    setPromptEditorOpen(false);
  };

  const kbdBase =
    "flex h-6 min-w-6 items-center justify-center rounded border px-1.5 text-[11px] font-semibold transition-colors";
  const kbdDefault = "border-border bg-card-elevated text-foreground-secondary";
  const kbdActive = "border-foreground/30 bg-foreground/10 text-foreground";

  const promptEditorBody = (mobile: boolean) => (
    <div className="space-y-2">
      <Textarea
        value={promptDraft}
        onChange={(e) => setPromptDraft(e.target.value)}
        className={
          mobile
            ? "min-h-[150px] flex-1 resize-none bg-card-elevated font-mono text-sm"
            : "min-h-[200px] resize-y bg-card-elevated font-mono text-sm"
        }
        placeholder="e.g., Always summarize in bullet points. Focus on action items and decisions..."
      />
      <div className="flex justify-end">
        <span className="text-xs text-foreground-muted">{promptDraft.length} characters</span>
      </div>
    </div>
  );

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          className="w-[380px] flex flex-col border-l border-border/50 bg-background/60 backdrop-blur-2xl sm:max-w-[380px] shadow-2xl"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <SheetHeader className="pb-4 border-b border-border/20">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-xl font-semibold">Settings</SheetTitle>
              <div className="hidden md:flex items-center gap-1">
                <kbd className={`${kbdBase} ${altPressed ? kbdActive : kbdDefault}`}>
                  {typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent) ? (
                    <span className="text-xs leading-none">⌥</span>
                  ) : (
                    "Alt"
                  )}
                </kbd>
                <kbd className={`${kbdBase} ${sPressed ? kbdActive : kbdDefault}`}>S</kbd>
              </div>
            </div>
            <SheetDescription className="sr-only">
              Configure your API keys and provider settings
            </SheetDescription>
          </SheetHeader>

          <div className="mx-4 flex items-start gap-2 rounded-md bg-info-muted p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
            <p className="text-xs text-foreground-secondary">
              Your API keys are stored in your browser only and are never saved on the server.
            </p>
          </div>

          <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-6 px-4 pt-4 pb-6">
            <Collapsible open={apiKeysOpen} onOpenChange={handleApiKeysOpen}>
              <SectionHeader>API Keys</SectionHeader>
              <CollapsibleContent>
                <div className="pt-3">
                  <ApiKeyManager providers={providers} onKeyChange={handleKeyChange} />
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            <Collapsible open={aiModelOpen} onOpenChange={handleAiModelOpen}>
              <SectionHeader>AI Model</SectionHeader>
              <CollapsibleContent>
                <div className="space-y-4 pt-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Default AI Model</p>
                    <p className="text-xs text-foreground-muted mt-0.5">
                      Used for all features unless overridden below.
                    </p>
                  </div>

                  <ProviderSelector
                    providers={providers}
                    selectedProvider={selectedProvider}
                    onProviderChange={onProviderChange}
                    keyVersion={keyVersion}
                  />

                  {selectedProvider !== "azure_openai" ? (
                    <ModelSelector
                      models={currentProvider?.models ?? []}
                      selectedModel={selectedModel}
                      onModelChange={onModelChange}
                    />
                  ) : null}

                  {selectedProvider === "azure_openai" ? (
                    <>
                      <Separator />
                      <AzureConfigForm config={azureConfig} onConfigChange={onAzureConfigChange} />
                    </>
                  ) : null}

                  {selectedProvider === "langdock" ? (
                    <>
                      <Separator />
                      <LangdockConfigForm config={langdockConfig} onConfigChange={onLangdockConfigChange} />
                    </>
                  ) : null}

                  {advancedSettings && (
                    <>
                      <Separator />

                      <FeatureModelOverrides
                        featureOverrides={featureOverrides}
                        onFeatureOverridesChange={onFeatureOverridesChange}
                        defaultProvider={selectedProvider}
                        defaultModel={selectedModel}
                        providers={providers}
                      />
                    </>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            <Collapsible open={featuresOpen} onOpenChange={handleFeaturesOpen}>
              <SectionHeader>Features</SectionHeader>
              <CollapsibleContent>
                <div className="space-y-5 pt-3">
                  <div className="space-y-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted">
                      General
                    </p>

                    <div className="space-y-1.5">
                      <Label htmlFor="display-name" className="text-sm">Your Name</Label>
                      <Input
                        id="display-name"
                        type="text"
                        placeholder="e.g. Daniel"
                        value={displayName}
                        onChange={(e) => onDisplayNameChange(e.target.value)}
                        className="h-8 text-sm"
                      />
                      <p className="text-xs text-foreground-muted">
                        Used by the chatbot to understand who &quot;I&quot; / &quot;my&quot; refers to in transcripts
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <Label htmlFor="advanced-settings" className="text-sm">
                          Advanced Settings
                        </Label>
                        <p className="text-xs text-foreground-muted">
                          Show all configuration options for power users
                        </p>
                      </div>
                      <Switch
                        id="advanced-settings"
                        checked={advancedSettings}
                        onCheckedChange={onAdvancedSettingsChange}
                      />
                    </div>

                    {advancedSettings && (
                      <>
                        <ChatbotSettings
                          chatbotEnabled={chatbotEnabled}
                          onChatbotEnabledChange={onChatbotEnabledChange}
                          chatbotQAEnabled={chatbotQAEnabled}
                          onChatbotQAEnabledChange={onChatbotQAEnabledChange}
                          chatbotTranscriptEnabled={chatbotTranscriptEnabled}
                          onChatbotTranscriptEnabledChange={onChatbotTranscriptEnabledChange}
                          chatbotActionsEnabled={chatbotActionsEnabled}
                          onChatbotActionsEnabledChange={onChatbotActionsEnabledChange}
                        />

                        <div className="flex items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <Label htmlFor="sync-standard-realtime" className="text-sm">
                              Sync Standard + Realtime
                            </Label>
                            <p className="text-xs text-foreground-muted">
                              Starting one mode automatically starts the other with shared microphone input
                            </p>
                          </div>
                          <Switch
                            id="sync-standard-realtime"
                            checked={syncStandardRealtime}
                            onCheckedChange={onSyncStandardRealtimeChange}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm">Default Copy Format</Label>
                          <Select
                            value={defaultCopyFormat}
                            onValueChange={(v) => onDefaultCopyFormatChange(v as CopyFormat)}
                          >
                            <SelectTrigger className="h-8 w-[160px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.entries(COPY_FORMAT_LABELS) as [CopyFormat, string][]).map(([key, label]) => (
                                <SelectItem key={key} value={key}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm">Default Save Format</Label>
                          <Select
                            value={defaultSaveFormat}
                            onValueChange={(v) => onDefaultSaveFormatChange(v as SaveFormat)}
                          >
                            <SelectTrigger className="h-8 w-[160px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.entries(SAVE_FORMAT_LABELS) as [SaveFormat, string][]).map(([key, label]) => (
                                <SelectItem key={key} value={key}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm">Default Chatbot Copy Format</Label>
                          <Select
                            value={defaultChatbotCopyFormat}
                            onValueChange={(v) => onDefaultChatbotCopyFormatChange(v as ChatbotCopyFormat)}
                          >
                            <SelectTrigger className="h-8 w-[160px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.entries(CHATBOT_COPY_FORMAT_LABELS) as [ChatbotCopyFormat, string][]).map(([key, label]) => (
                                <SelectItem key={key} value={key}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <KeytermsListSelector
                          lists={keytermsLists}
                          selectedListId={selectedKeytermsListId}
                          onSelectList={onKeytermsListChange}
                          onSaveList={onSaveKeytermsList}
                          onUpdateList={onUpdateKeytermsList}
                          onDeleteList={onDeleteKeytermsList}
                        />
                      </>
                    )}
                  </div>

                  {advancedSettings && (
                    <>
                      <Separator />

                      {/* Standard mode sub-section */}
                      <div className="space-y-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted">
                          Standard
                        </p>

                        <div className="flex items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <Label htmlFor="auto-key-points" className="text-sm">
                              Speaker Key Points
                            </Label>
                            <p className="text-xs text-foreground-muted">
                              Auto-extract key point summaries per speaker after transcription
                            </p>
                          </div>
                          <Switch
                            id="auto-key-points"
                            checked={autoKeyPointsEnabled}
                            onCheckedChange={onAutoKeyPointsChange}
                          />
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <Label htmlFor="speaker-labels" className="text-sm">
                              Speaker Labels
                            </Label>
                            <p className="text-xs text-foreground-muted">
                              Suggest real speaker names from transcript content when extracting key points
                            </p>
                          </div>
                          <Switch
                            id="speaker-labels"
                            checked={speakerLabelsEnabled}
                            onCheckedChange={onSpeakerLabelsChange}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm">Speaker Count Range</Label>
                          <p className="text-xs text-foreground-muted">
                            Expected number of speakers in the recording
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-foreground-muted">Min</span>
                              <Input
                                type="number"
                                min={1}
                                max={maxSpeakers}
                                value={minSpeakersInput}
                                onChange={(e) => setMinSpeakersInput(e.target.value)}
                                onBlur={() => {
                                  const v = Math.max(1, Math.min(parseInt(minSpeakersInput) || 1, maxSpeakers));
                                  onMinSpeakersChange(v);
                                  setMinSpeakersInput(String(v));
                                }}
                                className="h-8 w-16 bg-card-elevated px-2 py-1.5 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                            </div>
                            <span className="mt-5 text-foreground-muted">–</span>
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-foreground-muted">Max</span>
                              <Input
                                type="number"
                                min={minSpeakers}
                                max={20}
                                value={maxSpeakersInput}
                                onChange={(e) => setMaxSpeakersInput(e.target.value)}
                                onBlur={() => {
                                  const v = Math.max(
                                    minSpeakers,
                                    Math.min(parseInt(maxSpeakersInput) || minSpeakers, 20),
                                  );
                                  onMaxSpeakersChange(v);
                                  setMaxSpeakersInput(String(v));
                                }}
                                className="h-8 w-16 bg-card-elevated px-2 py-1.5 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <Label htmlFor="show-standard-timestamps" className="text-sm">
                              Show Timestamps
                            </Label>
                            <p className="text-xs text-foreground-muted">
                              Display start/end timestamps for each utterance in the transcript
                            </p>
                          </div>
                          <Switch
                            id="show-standard-timestamps"
                            checked={showStandardTimestamps}
                            onCheckedChange={onShowStandardTimestampsChange}
                          />
                        </div>
                      </div>

                      <Separator />

                      {/* Realtime mode sub-section */}
                      <div className="space-y-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted">
                          Realtime
                        </p>

                        {/* Speech Model */}
                        <div className="space-y-2">
                          <Label className="text-sm">Speech Model</Label>
                          <p className="text-xs text-foreground-muted">
                            Choose between word-by-word streaming or turn-based with speaker diarization
                          </p>
                          <Select
                            value={realtimeSpeechModel}
                            onValueChange={(v) => onRealtimeSpeechModelChange(v as RealtimeSpeechModel)}
                          >
                            <SelectTrigger className="h-8 w-full text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fast">Fast — Word-by-word streaming, no speaker labels</SelectItem>
                              <SelectItem value="precise">Precise — Turn-based with speaker diarization</SelectItem>
                            </SelectContent>
                          </Select>
                          {realtimeSpeechModel === "precise" && (
                            <p className="text-xs text-foreground-muted">
                              Speaker labels are only available in Precise mode.
                            </p>
                          )}
                        </div>

                        {realtimeSpeechModel === "precise" && (
                          <>
                            <div className="flex items-center justify-between gap-3">
                              <div className="space-y-0.5">
                                <Label htmlFor="realtime-auto-key-points" className="text-sm">
                                  Auto Speaker Key Points
                                </Label>
                                <p className="text-xs text-foreground-muted">
                                  Auto-extract key point summaries per speaker when opening the Speaker Mapping dialog
                                </p>
                              </div>
                              <Switch
                                id="realtime-auto-key-points"
                                checked={autoKeyPointsEnabled}
                                onCheckedChange={onAutoKeyPointsChange}
                              />
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              <div className="space-y-0.5">
                                <Label htmlFor="realtime-speaker-labels" className="text-sm">
                                  Auto Speaker Labels
                                </Label>
                                <p className="text-xs text-foreground-muted">
                                  Suggest real speaker names from transcript content when extracting key points
                                </p>
                              </div>
                              <Switch
                                id="realtime-speaker-labels"
                                checked={speakerLabelsEnabled}
                                onCheckedChange={onSpeakerLabelsChange}
                              />
                            </div>
                          </>
                        )}

                        {/* System Prompt */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <Label className="text-sm">System Prompt</Label>
                            <Button variant="outline" size="sm" onClick={openPromptEditor} className="h-7 px-2 text-xs shrink-0">
                              <Pencil className="h-3.5 w-3.5 mr-1.5" />
                              Edit
                            </Button>
                          </div>
                          <p className="text-xs text-foreground-muted">
                            Customize the system prompt used for realtime summary generation.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm">Summary Interval</Label>
                          <p className="text-xs text-foreground-muted">
                            How often to automatically generate a summary during live recording
                          </p>
                          <Select
                            value={String(realtimeSummaryInterval)}
                            onValueChange={(v) => onRealtimeSummaryIntervalChange(Number(v) as SummaryInterval)}
                          >
                            <SelectTrigger className="h-8 w-[100px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {([1, 2, 3, 5, 10] as SummaryInterval[]).map((v) => (
                                <SelectItem key={v} value={String(v)}>
                                  {v} min
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <Label htmlFor="final-summary" className="text-sm">
                              Final Summary on Stop
                            </Label>
                            <p className="text-xs text-foreground-muted">
                              Automatically generate a full summary when recording is stopped
                            </p>
                          </div>
                          <Switch
                            id="final-summary"
                            checked={realtimeFinalSummaryEnabled}
                            onCheckedChange={onRealtimeFinalSummaryEnabledChange}
                          />
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <Label htmlFor="reevaluate-all" className="text-sm">
                              Re-evaluate Answered Questions
                            </Label>
                            <p className="text-xs text-foreground-muted">
                              Include already answered questions when manually refreshing Questions &amp; Topics
                            </p>
                          </div>
                          <Switch
                            id="reevaluate-all"
                            checked={realtimeReevaluateAll}
                            onCheckedChange={onRealtimeReevaluateAllChange}
                          />
                        </div>

                      </div>
                    </>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
            {advancedSettings && (
              <>
                <Separator />
                <Collapsible open={webhooksOpen} onOpenChange={handleWebhooksOpen}>
                  <SectionHeader>Webhooks</SectionHeader>
                  <CollapsibleContent className="pt-3 space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="webhook-url" className="text-sm">Webhook URL</Label>
                      <div className="flex items-center gap-1">
                        <Input
                          id="webhook-url"
                          type="url"
                          placeholder="https://example.com/webhook"
                          value={webhookUrl}
                          onChange={(e) => onWebhookUrlChange(e.target.value)}
                          className="h-8 text-sm"
                        />
                        {webhookUrl ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onWebhookUrlChange("")}
                            className="text-foreground-muted hover:text-destructive shrink-0"
                            aria-label="Clear webhook URL"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={async () => {
                              try {
                                const text = await navigator.clipboard.readText();
                                const trimmed = text.trim();
                                if (trimmed) onWebhookUrlChange(trimmed);
                              } catch {}
                            }}
                            className="text-foreground-muted hover:text-foreground shrink-0"
                            aria-label="Paste from clipboard"
                          >
                            <ClipboardPaste className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="webhook-secret" className="text-sm">Webhook Secret</Label>
                      <div className="flex items-center gap-1">
                        <div className="relative flex-1">
                          <Input
                            id="webhook-secret"
                            type={showWebhookSecret ? "text" : "password"}
                            placeholder="Optional HMAC secret"
                            value={webhookSecret}
                            onChange={(e) => onWebhookSecretChange(e.target.value)}
                            className="h-8 text-sm pr-9"
                          />
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
                            onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                            tabIndex={-1}
                          >
                            {showWebhookSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                        {webhookSecret ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onWebhookSecretChange("")}
                            className="text-foreground-muted hover:text-destructive shrink-0"
                            aria-label="Clear webhook secret"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={async () => {
                              try {
                                const text = await navigator.clipboard.readText();
                                const trimmed = text.trim();
                                if (trimmed) onWebhookSecretChange(trimmed);
                              } catch {}
                            }}
                            className="text-foreground-muted hover:text-foreground shrink-0"
                            aria-label="Paste from clipboard"
                          >
                            <ClipboardPaste className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm">Standard Mode</Label>
                      <Select value={webhookStandardTrigger} onValueChange={(v) => onWebhookStandardTriggerChange(v as WebhookStandardTrigger)}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="summary">After Summary</SelectItem>
                          <SelectItem value="transcript_and_summary">After Transcript &amp; Summary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm">Realtime Mode</Label>
                      <Select value={webhookRealtimeTrigger} onValueChange={(v) => onWebhookRealtimeTriggerChange(v as WebhookRealtimeTrigger)}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="on_stop">When Session Stops</SelectItem>
                          <SelectItem value="on_stop_with_final_summary">After Final Summary (always fire)</SelectItem>
                          <SelectItem value="only_with_final_summary">After Final Summary (skip if disabled)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm">Custom Arguments</Label>
                      <p className="text-xs text-foreground-muted">
                        Key-value pairs sent in the webhook payload under <code className="text-xs">data.user_args</code>.
                      </p>
                      <div className="space-y-2">
                        {webhookUserArgs.map((arg, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <Input
                              placeholder="Key"
                              value={arg.key}
                              onChange={(e) => {
                                const updated = [...webhookUserArgs];
                                updated[idx] = { ...updated[idx], key: e.target.value };
                                onWebhookUserArgsChange(updated);
                              }}
                              className="h-8 text-sm flex-1"
                            />
                            <Input
                              placeholder="Value"
                              value={arg.value}
                              onChange={(e) => {
                                const updated = [...webhookUserArgs];
                                updated[idx] = { ...updated[idx], value: e.target.value };
                                onWebhookUserArgsChange(updated);
                              }}
                              className="h-8 text-sm flex-1"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const updated = webhookUserArgs.filter((_, i) => i !== idx);
                                onWebhookUserArgsChange(updated);
                              }}
                              className="text-foreground-muted hover:text-destructive shrink-0 h-8 w-8"
                              aria-label="Remove argument"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onWebhookUserArgsChange([...webhookUserArgs, { key: "", value: "" }])}
                          className="w-full h-8 text-sm"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1.5" />
                          Add Argument
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}
            <Separator />

            <div className="pt-2 pb-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                onClick={() => setResetConfirmOpen(true)}
              >
                <RotateCcw className="mr-2 h-3.5 w-3.5" />
                Reset All Settings to Defaults
              </Button>
            </div>
          </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Desktop: Dialog editor */}
      <Dialog open={!isMobile && promptEditorOpen} onOpenChange={(o) => !o && cancelPrompt()}>
        <DialogContent className="max-w-2xl bg-card">
          <DialogHeader>
            <DialogTitle>Edit System Prompt</DialogTitle>
            <DialogDescription>
              Provide custom instructions that guide the AI when generating summaries. Use{" "}
              <code className="rounded bg-card-elevated px-1 py-0.5 font-mono text-[11px]">
                {"{language}"}
              </code>{" "}
              to automatically insert the detected transcript language.
            </DialogDescription>
          </DialogHeader>
          {promptEditorBody(false)}
          <DialogFooter>
            <Button variant="ghost" onClick={cancelPrompt}>
              Cancel
            </Button>
            <Button onClick={savePrompt}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile: bottom Sheet editor */}
      <Sheet open={isMobile && promptEditorOpen} onOpenChange={(o) => !o && cancelPrompt()}>
        <SheetContent side="bottom" className="h-[85vh] bg-card flex flex-col gap-4">
          <SheetHeader>
            <SheetTitle>Edit System Prompt</SheetTitle>
            <SheetDescription>
              Custom instructions for the AI. Use{" "}
              <code className="rounded bg-card-elevated px-1 py-0.5 font-mono text-[11px]">
                {"{language}"}
              </code>{" "}
              to auto-insert the detected language.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-hidden flex flex-col gap-2">
            {promptEditorBody(true)}
          </div>
          <div className="flex flex-col gap-2 pb-2">
            <Button onClick={savePrompt}>
              Save
            </Button>
            <Button variant="ghost" onClick={cancelPrompt}>
              Cancel
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Reset confirmation dialog */}
      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <DialogContent className="sm:max-w-[400px] bg-card">
          <DialogHeader>
            <DialogTitle>Reset Settings</DialogTitle>
            <DialogDescription>
              Are you sure you want to reset all settings to their default values? API keys will not be affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResetConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onResetSettings();
                setResetConfirmOpen(false);
                toast.success("Settings have been reset to defaults.");
              }}
            >
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
