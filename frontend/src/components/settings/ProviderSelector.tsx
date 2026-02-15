"use client";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApiKeys } from "@/hooks/useApiKeys";
import type { LLMProvider, ProviderInfo } from "@/lib/types";

interface ProviderSelectorProps {
  providers: ProviderInfo[];
  selectedProvider: LLMProvider;
  onProviderChange: (provider: LLMProvider) => void;
}

export function ProviderSelector({
  providers,
  selectedProvider,
  onProviderChange,
}: ProviderSelectorProps) {
  const { hasKey } = useApiKeys();
  const missingKey = !hasKey(selectedProvider);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium text-foreground-secondary">
          LLM Provider
        </Label>
        {missingKey ? (
          <Badge
            variant="outline"
            className="border-warning bg-warning-muted text-warning text-xs"
          >
            No API key
          </Badge>
        ) : null}
      </div>
      <Select
        value={selectedProvider}
        onValueChange={(val) => onProviderChange(val as LLMProvider)}
      >
        <SelectTrigger className="bg-card-elevated">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {providers.map((p) => (
            <SelectItem
              key={p.id}
              value={p.id}
              className={hasKey(p.id) ? "" : "text-foreground-muted"}
            >
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
