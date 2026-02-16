"use client";

import { useState, useCallback } from "react";
import { Info } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
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
}: SettingsSheetProps) {
  const providers = config?.providers ?? [];
  const currentProvider = providers.find((p) => p.id === selectedProvider);
  const [keyVersion, setKeyVersion] = useState(0);
  const handleKeyChange = useCallback(() => {
    setKeyVersion((v) => v + 1);
  }, []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-[380px] overflow-y-auto border-l border-border bg-card sm:max-w-[380px]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
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

        <div className="space-y-6 px-4">
          <ApiKeyManager providers={providers} onKeyChange={handleKeyChange} />

          <Separator />

          <div className="space-y-4">
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
