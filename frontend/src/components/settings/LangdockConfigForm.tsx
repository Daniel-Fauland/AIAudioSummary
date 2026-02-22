"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApiKeys } from "@/hooks/useApiKeys";
import type { LangdockConfig } from "@/lib/types";

interface LangdockConfigFormProps {
  config: LangdockConfig;
  onConfigChange: (config: LangdockConfig) => void;
}

export function LangdockConfigForm({ config, onConfigChange }: LangdockConfigFormProps) {
  const { setLangdockConfig } = useApiKeys();
  const [region, setRegion] = useState<"eu" | "us">(config.region);

  const handleRegionChange = (value: "eu" | "us") => {
    const updated: LangdockConfig = { region: value };
    setRegion(value);
    setLangdockConfig(updated);
    onConfigChange(updated);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground-secondary">Langdock Configuration</h3>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-foreground-secondary">Region</Label>
        <Select value={region} onValueChange={handleRegionChange}>
          <SelectTrigger className="bg-card-elevated">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="eu">EU</SelectItem>
            <SelectItem value="us">US</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
