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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ApiKeyManager } from "@/components/settings/ApiKeyManager";
import { ProviderSelector } from "@/components/settings/ProviderSelector";
import { ModelSelector } from "@/components/settings/ModelSelector";
import { AzureConfigForm } from "@/components/settings/AzureConfigForm";
import type { AzureConfig, ConfigResponse, LLMProvider } from "@/lib/types";

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
              <div className="pt-3">
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
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </SheetContent>
    </Sheet>
  );
}
