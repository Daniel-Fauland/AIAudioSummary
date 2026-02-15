"use client";

import { useState } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useApiKeys } from "@/hooks/useApiKeys";
import type { ProviderInfo, LLMProvider } from "@/lib/types";

interface ApiKeyManagerProps {
  providers: ProviderInfo[];
}

function KeyInput({
  label,
  provider,
}: {
  label: string;
  provider: LLMProvider | "assemblyai";
}) {
  const { getKey, setKey, hasKey, clearKey } = useApiKeys();
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState(() => getKey(provider));

  const saved = hasKey(provider);

  const handleChange = (newValue: string) => {
    setValue(newValue);
    setKey(provider, newValue);
  };

  const handleClear = () => {
    setValue("");
    clearKey(provider);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div
          className={`h-2 w-2 rounded-full ${saved ? "bg-success" : "bg-foreground-muted"}`}
        />
        <Label className="text-sm font-medium text-foreground-secondary">
          {label}
        </Label>
      </div>
      <div className="flex items-center gap-1">
        <div className="relative flex-1">
          <Input
            type={visible ? "text" : "password"}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={`Enter ${label.toLowerCase()}`}
            className="bg-card-elevated pr-9"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full w-9 text-foreground-muted hover:text-foreground"
            onClick={() => setVisible((v) => !v)}
            type="button"
            aria-label={visible ? "Hide key" : "Show key"}
          >
            {visible ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
        {saved ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="text-foreground-muted hover:text-destructive"
            aria-label="Clear key"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function ApiKeyManager({ providers }: ApiKeyManagerProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground-secondary">
          Transcription
        </h3>
        <KeyInput label="AssemblyAI API Key" provider="assemblyai" />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground-secondary">
          LLM Providers
        </h3>
        {providers.map((provider) => (
          <KeyInput
            key={provider.id}
            label={`${provider.name} API Key`}
            provider={provider.id}
          />
        ))}
      </div>
    </div>
  );
}
