"use client";

import { useState, useRef } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AddQuestionInputProps {
  onAdd: (question: string) => void;
  disabled?: boolean;
}

export function AddQuestionInput({ onAdd, disabled }: AddQuestionInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted pointer-events-none" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a question or topic..."
          disabled={disabled}
          className="pl-9"
        />
      </div>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        aria-label="Add question"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
