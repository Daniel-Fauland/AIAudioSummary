"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface StepResultProps {
  generatedPrompt: string;
  onGeneratedPromptChange: (value: string) => void;
  onRegenerate: (feedback?: string) => void;
  isLoading: boolean;
}

export function StepResult({
  generatedPrompt,
  onGeneratedPromptChange,
  onRegenerate,
  isLoading,
}: StepResultProps) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState("");

  const handleRegenerate = () => {
    onRegenerate(feedback.trim() || undefined);
    setFeedback("");
    setFeedbackOpen(false);
  };

  return (
    <div className="space-y-4 py-2">
      {/* Generated prompt preview */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-foreground-secondary">
          Generated Prompt
        </Label>
        <Textarea
          value={generatedPrompt}
          onChange={(e) => onGeneratedPromptChange(e.target.value)}
          className="min-h-[220px] resize-y bg-card-elevated font-mono text-xs leading-relaxed"
          placeholder="Your generated prompt will appear here..."
          disabled={isLoading}
        />
        <p className="text-xs text-foreground-muted">
          You can edit this prompt directly before using it.
        </p>
      </div>

      {/* Regenerate section */}
      <Collapsible open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-foreground-muted hover:text-foreground-secondary"
          >
            {feedbackOpen ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            Want changes? Describe what to adjust
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 space-y-2">
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="e.g., Make it shorter. Add a section for risks. Use more formal language."
              className="min-h-[80px] resize-y bg-card-elevated text-sm"
              autoFocus
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={isLoading}
              className="gap-1.5"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {isLoading ? "Regenerating..." : "Regenerate"}
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
