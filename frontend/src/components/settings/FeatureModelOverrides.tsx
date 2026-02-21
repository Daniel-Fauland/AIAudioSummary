"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import type { LLMFeature, FeatureModelOverride, LLMProvider, ProviderInfo } from "@/lib/types";
import { LLM_FEATURE_LABELS } from "@/lib/types";
import { FeatureModelRow } from "./FeatureModelRow";

interface FeatureModelOverridesProps {
  featureOverrides: Partial<Record<LLMFeature, FeatureModelOverride>>;
  onFeatureOverridesChange: (
    overrides: Partial<Record<LLMFeature, FeatureModelOverride>>,
  ) => void;
  defaultProvider: LLMProvider;
  defaultModel: string;
  providers: ProviderInfo[];
}

export function FeatureModelOverrides({
  featureOverrides,
  onFeatureOverridesChange,
  defaultProvider,
  defaultModel,
  providers,
}: FeatureModelOverridesProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasAnyOverride = Object.keys(featureOverrides).length > 0;
  const features = Object.keys(LLM_FEATURE_LABELS) as LLMFeature[];

  const handleResetAll = () => {
    onFeatureOverridesChange({});
  };

  const handleOverrideChange = (
    feature: LLMFeature,
    override: FeatureModelOverride | null,
  ) => {
    const next = { ...featureOverrides };
    if (override === null) {
      delete next[feature];
    } else {
      next[feature] = override;
    }
    onFeatureOverridesChange(next);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between py-1 text-sm font-medium text-foreground-secondary hover:text-foreground transition-colors">
        <span>Feature-Specific Models</span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1 pt-2">
        {hasAnyOverride ? (
          <div className="flex justify-end pb-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleResetAll}
            >
              Reset all to default
            </Button>
          </div>
        ) : null}
        {features.map((feature) => (
          <FeatureModelRow
            key={feature}
            feature={feature}
            override={featureOverrides[feature] ?? null}
            defaultProvider={defaultProvider}
            defaultModel={defaultModel}
            providers={providers}
            onOverrideChange={(override) => handleOverrideChange(feature, override)}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
