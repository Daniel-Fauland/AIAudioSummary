"use client";

import { Info, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddQuestionInput } from "./AddQuestionInput";
import { LiveQuestionItem } from "./LiveQuestionItem";
import type { LiveQuestion } from "@/lib/types";

interface LiveQuestionsProps {
  questions: LiveQuestion[];
  isEvaluating: boolean;
  warningDismissed: boolean;
  onAdd: (question: string) => void;
  onRemove: (id: string) => void;
  onReset: (id: string) => void;
  onDismissWarning: () => void;
}

export function LiveQuestions({
  questions,
  isEvaluating,
  warningDismissed,
  onAdd,
  onRemove,
  onReset,
  onDismissWarning,
}: LiveQuestionsProps) {
  const answeredCount = questions.filter((q) => q.status === "answered").length;
  const totalCount = questions.length;

  // Sort: unanswered first, then answered
  const sorted = [...questions].sort((a, b) => {
    if (a.status === b.status) return a.createdAt - b.createdAt;
    return a.status === "unanswered" ? -1 : 1;
  });

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold">Questions &amp; Topics</CardTitle>
          <div className="flex items-center gap-2">
            {isEvaluating && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground-muted" />
            )}
            {totalCount > 0 && (
              <Badge
                variant="secondary"
                className="text-xs font-normal"
              >
                {answeredCount}/{totalCount} answered
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Token warning */}
        {!warningDismissed && questions.length > 0 && (
          <div className="flex items-start gap-2 rounded-md border border-border bg-[var(--info-muted)] px-3 py-2.5 text-xs text-foreground-secondary">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[var(--info)]" />
            <span className="flex-1">
              This feature sends the full transcript to the LLM on each refresh and may consume a significant number of tokens.
            </span>
            <button
              type="button"
              onClick={onDismissWarning}
              className="shrink-0 text-foreground-muted hover:text-foreground-secondary transition-colors ml-1"
              aria-label="Dismiss warning"
            >
              ✕
            </button>
          </div>
        )}

        {/* Add input */}
        <AddQuestionInput onAdd={onAdd} />

        {/* Question list */}
        {sorted.length === 0 ? (
          <p className="text-xs text-foreground-muted py-2">
            Add questions or topics to track during the meeting.
          </p>
        ) : (
          <div className="divide-y divide-border/50">
            {sorted.map((q) => (
              <LiveQuestionItem
                key={q.id}
                question={q}
                onRemove={onRemove}
                onReset={onReset}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
