"use client";

import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApiKeys } from "@/hooks/useApiKeys";
import type { LLMFeature, FeatureModelOverride, LLMProvider, ProviderInfo } from "@/lib/types";
import { LLM_FEATURE_LABELS } from "@/lib/types";
import { FeatureModelConfigModal } from "./FeatureModelConfigModal";

interface FeatureModelRowProps {
  feature: LLMFeature;
  override: FeatureModelOverride | null;
  defaultProvider: LLMProvider;
  defaultModel: string;
  providers: ProviderInfo[];
  onOverrideChange: (override: FeatureModelOverride | null) => void;
}

export function FeatureModelRow({
  feature,
  override,
  defaultProvider,
  defaultModel,
  providers,
  onOverrideChange,
}: FeatureModelRowProps) {
  const { hasKey } = useApiKeys();

  const providerLabel = override
    ? (providers.find((p) => p.id === override.provider)?.name ?? override.provider)
    : null;

  const missingKey = override ? !hasKey(override.provider) : false;

  return (
    <div className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-card-elevated transition-colors">
      <span className="text-sm font-medium">{LLM_FEATURE_LABELS[feature]}</span>
      <div className="flex items-center gap-2 shrink-0">
        {override ? (
          <>
            <span className="text-xs text-foreground-secondary">
              {providerLabel}
              {override.model ? ` / ${override.model}` : ""}
            </span>
            {missingKey ? (
              <Badge
                variant="outline"
                className="border-warning bg-warning-muted text-warning text-xs px-1.5"
              >
                No key
              </Badge>
            ) : null}
          </>
        ) : (
          <span className="text-xs text-foreground-muted">Using default</span>
        )}
        <FeatureModelConfigModal
          feature={feature}
          override={override}
          defaultProvider={defaultProvider}
          defaultModel={defaultModel}
          providers={providers}
          onSave={onOverrideChange}
        >
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-foreground-muted hover:text-foreground"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
        </FeatureModelConfigModal>
      </div>
    </div>
  );
}
