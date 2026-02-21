"use client";

import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

interface StepBasePromptProps {
  basePrompt: string;
  onBasePromptChange: (value: string) => void;
  isLoading: boolean;
}

export function StepBasePrompt({
  basePrompt,
  onBasePromptChange,
  isLoading,
}: StepBasePromptProps) {
  if (isLoading) {
    return (
      <div className="space-y-4 py-2">
        <div className="flex items-center gap-3 text-sm text-foreground-muted">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>Analyzing your prompt...</span>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 py-2">
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-foreground-secondary">
          Existing Prompt (optional)
        </Label>
        <Textarea
          value={basePrompt}
          onChange={(e) => onBasePromptChange(e.target.value)}
          placeholder="Paste an existing prompt to refine it, or skip to start fresh."
          className="min-h-[180px] resize-y bg-card-elevated text-sm"
          autoFocus
        />
      </div>
      <p className="text-xs text-foreground-muted">
        If you have an existing system prompt, paste it here. The assistant will analyze it and
        ask questions to improve it. Leave blank to create a new prompt from scratch.
      </p>
    </div>
  );
}
