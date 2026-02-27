"use client";

import { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ModelSelectorProps {
  models: string[];
  selectedModel: string;
  onModelChange: (model: string) => void;
  isAzure?: boolean;
}


export function ModelSelector({
  models,
  selectedModel,
  onModelChange,
  isAzure,
}: ModelSelectorProps) {
  // Auto-correct if the selected model is no longer in the available list
  useEffect(() => {
    if (!isAzure && models.length > 0 && !models.includes(selectedModel)) {
      onModelChange(models[0]);
    }
  }, [models, selectedModel, isAzure, onModelChange]);

  if (isAzure || models.length === 0) {
    return (
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-foreground-secondary">
          {isAzure ? "Deployment Name" : "Model"}
        </Label>
        <Input
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          placeholder={isAzure ? "e.g., gpt-4-deployment" : "Enter model name"}
          className="bg-card-elevated"
        />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground-secondary">
        Model
      </Label>
      <Select
        value={selectedModel || models[0]}
        onValueChange={onModelChange}
      >
        <SelectTrigger className="bg-card-elevated">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {models.map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
