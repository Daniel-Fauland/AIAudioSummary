"use client";

import { useState, useCallback, useEffect } from "react";
import { ChevronDown, Info } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ApiKeyManager } from "@/components/settings/ApiKeyManager";
import { ProviderSelector } from "@/components/settings/ProviderSelector";
import { ModelSelector } from "@/components/settings/ModelSelector";
import { AzureConfigForm } from "@/components/settings/AzureConfigForm";
import type { AzureConfig, ConfigResponse, LLMProvider, SummaryInterval } from "@/lib/types";

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
  autoKeyPointsEnabled: boolean;
  onAutoKeyPointsChange: (enabled: boolean) => void;
  minSpeakers: number;
  onMinSpeakersChange: (value: number) => void;
  maxSpeakers: number;
  onMaxSpeakersChange: (value: number) => void;
  realtimeSummaryInterval: SummaryInterval;
  onRealtimeSummaryIntervalChange: (interval: SummaryInterval) => void;
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
  autoKeyPointsEnabled,
  onAutoKeyPointsChange,
  minSpeakers,
  onMinSpeakersChange,
  maxSpeakers,
  onMaxSpeakersChange,
  realtimeSummaryInterval,
  onRealtimeSummaryIntervalChange,
}: SettingsSheetProps) {
  const providers = config?.providers ?? [];
  const currentProvider = providers.find((p) => p.id === selectedProvider);
  const [keyVersion, setKeyVersion] = useState(0);
  const handleKeyChange = useCallback(() => {
    setKeyVersion((v) => v + 1);
  }, []);

  const [apiKeysOpen, setApiKeysOpen] = useState(() =>
    readSection("aias:v1:settings:section:apiKeys", true)
  );
  const [aiModelOpen, setAiModelOpen] = useState(() =>
    readSection("aias:v1:settings:section:aiModel", true)
  );
  const [featuresOpen, setFeaturesOpen] = useState(() =>
    readSection("aias:v1:settings:section:features", true)
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

  const kbdBase = "flex h-6 min-w-6 items-center justify-center rounded border px-1.5 text-[11px] font-semibold transition-colors";
  const kbdDefault = "border-border bg-card-elevated text-foreground-secondary";
  const kbdActive = "border-foreground/30 bg-foreground/10 text-foreground";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-[380px] overflow-y-auto border-l border-border bg-card sm:max-w-[380px]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader>
          <div className="flex items-center gap-2">
            <SheetTitle>Settings</SheetTitle>
            <div className="hidden md:flex items-center gap-1">
              <kbd className={`${kbdBase} ${altPressed ? kbdActive : kbdDefault}`}>
                {typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent) ? <span className="text-xs leading-none">⌥</span> : "Alt"}
              </kbd>
              <kbd className={`${kbdBase} ${sPressed ? kbdActive : kbdDefault}`}>
                S
              </kbd>
            </div>
          </div>
          <SheetDescription className="sr-only">
            Configure your API keys and provider settings
          </SheetDescription>
        </SheetHeader>

        <div className="mx-4 flex items-start gap-2 rounded-md bg-info-muted p-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
          <p className="text-xs text-foreground-secondary">
            Your API keys are stored in your browser only and are never saved on
            the server.
          </p>
        </div>

        <div className="space-y-6 px-4 pb-6">
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
                    <AzureConfigForm
                      config={azureConfig}
                      onConfigChange={onAzureConfigChange}
                    />
                  </>
                ) : null}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          <Collapsible open={featuresOpen} onOpenChange={handleFeaturesOpen}>
            <SectionHeader>Features</SectionHeader>
            <CollapsibleContent>
              <div className="space-y-4 pt-3">
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
                        value={minSpeakers}
                        onChange={(e) => {
                          const v = Math.max(1, Math.min(parseInt(e.target.value) || 1, maxSpeakers));
                          onMinSpeakersChange(v);
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
                        value={maxSpeakers}
                        onChange={(e) => {
                          const v = Math.max(minSpeakers, Math.min(parseInt(e.target.value) || minSpeakers, 20));
                          onMaxSpeakersChange(v);
                        }}
                        className="h-8 w-16 bg-card-elevated px-2 py-1.5 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Realtime Summary Interval</Label>
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
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </SheetContent>
    </Sheet>
  );
}
