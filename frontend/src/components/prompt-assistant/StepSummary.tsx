"use client";

import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { AssistantQuestion } from "@/lib/types";

interface StepSummaryProps {
  questions: AssistantQuestion[];
  answers: Record<string, string | string[]>;
  additionalNotes: string;
  onAdditionalNotesChange: (value: string) => void;
  isLoading: boolean;
}

function formatAnswer(value: string | string[]): string {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "—";
  }
  return value?.trim() || "—";
}

function getQuestionLabel(question: AssistantQuestion): string {
  return question.question;
}

export function StepSummary({
  questions,
  answers,
  additionalNotes,
  onAdditionalNotesChange,
  isLoading,
}: StepSummaryProps) {
  if (isLoading) {
    return (
      <div className="space-y-4 py-2">
        <div className="flex items-center gap-3 text-sm text-foreground-muted">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>Generating your prompt...</span>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 py-2">
      {/* Answers summary */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground-secondary">Your Preferences</Label>
        <div className="rounded-lg border border-border bg-card-elevated">
          <table className="w-full text-sm">
            <tbody>
              {questions.map((question, index) => (
                <tr
                  key={question.id}
                  className={index < questions.length - 1 ? "border-b border-border" : ""}
                >
                  <td className="py-2.5 pl-4 pr-3 align-top font-medium text-foreground-secondary w-[45%]">
                    {getQuestionLabel(question)}
                  </td>
                  <td className="py-2.5 pl-3 pr-4 align-top text-foreground">
                    {formatAnswer(answers[question.id] ?? "")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Additional notes */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-foreground-secondary">
          Anything else the prompt should include?
        </Label>
        <Textarea
          value={additionalNotes}
          onChange={(e) => onAdditionalNotesChange(e.target.value)}
          placeholder="e.g., Always end with an action items list. Use formal language. Include a risk assessment section."
          className="min-h-[90px] resize-y bg-card-elevated text-sm"
        />
      </div>
    </div>
  );
}
