"use client";

import { useState } from "react";
import { CheckCircle, Circle, X, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LiveQuestion } from "@/lib/types";

interface LiveQuestionItemProps {
  question: LiveQuestion;
  onRemove: (id: string) => void;
  onReset: (id: string) => void;
}

export function LiveQuestionItem({ question, onRemove, onReset }: LiveQuestionItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isAnswered = question.status === "answered";

  return (
    <div
      className="flex items-start gap-2.5 py-2 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Status icon */}
      <div className="mt-0.5 shrink-0">
        {isAnswered ? (
          <CheckCircle className="h-4 w-4 text-[var(--success)]" />
        ) : (
          <Circle className="h-4 w-4 text-foreground-muted" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm leading-snug",
            isAnswered && "text-foreground-muted line-through decoration-foreground-muted/40"
          )}
        >
          {question.question}
        </p>
        {isAnswered && question.answer && (
          <p className="text-xs text-foreground-muted mt-0.5 leading-snug">
            {question.answer}
          </p>
        )}
      </div>

      {/* Hover actions */}
      <div
        className={cn(
          "flex items-center gap-1 shrink-0 transition-opacity duration-150",
          isHovered ? "opacity-100" : "opacity-0"
        )}
      >
        {isAnswered && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onReset(question.id)}
            aria-label="Mark as unanswered"
            title="Mark as unanswered"
          >
            <Undo2 className="h-3 w-3" />
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onRemove(question.id)}
          aria-label="Remove question"
          title="Remove question"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
