"use client";

import { useState } from "react";
import { Eye, EyeOff, X, ClipboardPaste } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useApiKeys } from "@/hooks/useApiKeys";
import type { ProviderInfo, LLMProvider } from "@/lib/types";

interface ApiKeyManagerProps {
  providers: ProviderInfo[];
  onKeyChange?: () => void;
}

function isKeyFormatValid(provider: LLMProvider | "assemblyai", key: string): boolean {
  if (!key) return true;
  switch (provider) {
    case "openai":
      return key.startsWith("sk-") && key.length >= 40;
    case "anthropic":
      return key.startsWith("sk-ant-") && key.length >= 80;
    case "gemini":
      return key.startsWith("AIzaSy") && key.length >= 35;
    case "langdock":
      return key.startsWith("sk-") && key.length >= 20;
    case "azure_openai":
      return key.length >= 20;
    case "assemblyai":
      return key.length >= 20;
    default:
      return true;
  }
}

function KeyInput({
  label,
  provider,
  onKeyChange,
}: {
  label: string;
  provider: LLMProvider | "assemblyai";
  onKeyChange?: () => void;
}) {
  const { getKey, setKey, hasKey, clearKey } = useApiKeys();
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState(() => getKey(provider));

  const saved = hasKey(provider);
  const formatValid = isKeyFormatValid(provider, value);

  const handleChange = (newValue: string) => {
    setValue(newValue);
    setKey(provider, newValue);
    onKeyChange?.();
  };

  const handleClear = () => {
    setValue("");
    clearKey(provider);
    onKeyChange?.();
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const trimmed = text.trim();
      if (trimmed) {
        handleChange(trimmed);
      }
    } catch {
      // Clipboard access denied — silently ignore
    }
  };

  const dotColor = !saved
    ? "bg-foreground-muted"
    : formatValid
      ? "bg-success"
      : "bg-warning";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${dotColor}`} />
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
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePaste}
            className="text-foreground-muted hover:text-foreground"
            aria-label="Paste from clipboard"
          >
            <ClipboardPaste className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function ApiKeyManager({ providers, onKeyChange }: ApiKeyManagerProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground-secondary">
          Transcription
        </h3>
        <KeyInput label="AssemblyAI API Key" provider="assemblyai" onKeyChange={onKeyChange} />
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
            onKeyChange={onKeyChange}
          />
        ))}
      </div>
    </div>
  );
}
