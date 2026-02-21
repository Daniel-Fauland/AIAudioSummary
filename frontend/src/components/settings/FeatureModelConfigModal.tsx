"use client";

import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { LLMFeature, FeatureModelOverride, LLMProvider, ProviderInfo } from "@/lib/types";
import { LLM_FEATURE_LABELS } from "@/lib/types";
import { ProviderSelector } from "./ProviderSelector";
import { ModelSelector } from "./ModelSelector";
import { AzureConfigForm } from "./AzureConfigForm";
import { LangdockConfigForm } from "./LangdockConfigForm";
import { useApiKeys } from "@/hooks/useApiKeys";

interface FeatureModelConfigModalProps {
  feature: LLMFeature;
  override: FeatureModelOverride | null;
  defaultProvider: LLMProvider;
  defaultModel: string;
  providers: ProviderInfo[];
  onSave: (override: FeatureModelOverride | null) => void;
  children: ReactNode;
}

export function FeatureModelConfigModal({
  feature,
  override,
  defaultProvider,
  defaultModel,
  providers,
  onSave,
  children,
}: FeatureModelConfigModalProps) {
  const [open, setOpen] = useState(false);
  const { getAzureConfig, setAzureConfig, getLangdockConfig, setLangdockConfig } = useApiKeys();

  const [localProvider, setLocalProvider] = useState<LLMProvider>(
    override?.provider ?? defaultProvider,
  );
  const [localModel, setLocalModel] = useState<string>(override?.model ?? defaultModel);

  const handleOpenChange = (val: boolean) => {
    if (val) {
      setLocalProvider(override?.provider ?? defaultProvider);
      setLocalModel(override?.model ?? defaultModel);
    }
    setOpen(val);
  };

  const handleProviderChange = (provider: LLMProvider) => {
    setLocalProvider(provider);
    const providerInfo = providers.find((p) => p.id === provider);
    setLocalModel(providerInfo?.models[0] ?? "");
  };

  const handleSave = () => {
    onSave({ provider: localProvider, model: localModel });
    setOpen(false);
  };

  const handleResetToDefault = () => {
    onSave(null);
    setOpen(false);
  };

  const currentProviderInfo = providers.find((p) => p.id === localProvider);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[420px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Configure Model — {LLM_FEATURE_LABELS[feature]}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <ProviderSelector
            providers={providers}
            selectedProvider={localProvider}
            onProviderChange={handleProviderChange}
          />

          {localProvider !== "azure_openai" ? (
            <ModelSelector
              models={currentProviderInfo?.models ?? []}
              selectedModel={localModel}
              onModelChange={setLocalModel}
            />
          ) : null}

          {localProvider === "azure_openai" ? (
            <>
              <Separator />
              <AzureConfigForm
                config={getAzureConfig()}
                onConfigChange={setAzureConfig}
              />
            </>
          ) : null}

          {localProvider === "langdock" ? (
            <>
              <Separator />
              <LangdockConfigForm
                config={getLangdockConfig()}
                onConfigChange={setLangdockConfig}
              />
            </>
          ) : null}
        </div>

        <DialogFooter className="flex flex-row items-center gap-2">
          {override ? (
            <Button
              variant="ghost"
              size="sm"
              className="mr-auto text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleResetToDefault}
            >
              Reset to default
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
