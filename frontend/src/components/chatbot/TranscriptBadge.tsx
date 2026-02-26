"use client";

import { Link2, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TranscriptBadgeProps {
  wordCount: number;
  isLive?: boolean;
  isLiveActive?: boolean;
  suspended?: boolean;
  onDetach: () => void;
  onReattach?: () => void;
}

function formatWordCount(count: number, live?: boolean): string {
  if (!live) return count.toLocaleString();
  if (count <= 10) return String(count);
  if (count < 100) return `${Math.floor(count / 10) * 10}+`;
  return `${Math.floor(count / 100) * 100}+`;
}

export function TranscriptBadge({ wordCount, isLive, isLiveActive, suspended, onDetach, onReattach }: TranscriptBadgeProps) {
  const formattedCount = formatWordCount(wordCount, isLive);

  if (suspended) {
    return (
      <div className="mx-3 mb-1 flex items-center gap-2 rounded-md border-l-2 border-l-border bg-muted/30 px-3 py-1.5 opacity-60">
        <Paperclip className="h-3.5 w-3.5 text-foreground-muted shrink-0" />
        <span className="text-xs text-foreground-muted">
          Transcript paused
        </span>
        <span className="text-xs text-foreground-muted">
          {formattedCount} words
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-5 w-5 shrink-0"
          onClick={onReattach}
          title="Reattach transcript"
        >
          <Link2 className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-3 mb-1 flex items-center gap-2 rounded-md border-l-2 border-l-primary bg-muted/50 px-3 py-1.5">
      {isLive ? (
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          {isLiveActive && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          )}
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
      ) : (
        <Paperclip className="h-3.5 w-3.5 text-foreground-muted shrink-0" />
      )}
      <span className="text-xs text-foreground-secondary">
        {isLive ? "Live Transcript" : "Transcript attached"}
      </span>
      <span className="text-xs text-foreground-muted">
        {formattedCount} words
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="ml-auto h-5 w-5 shrink-0"
        onClick={onDetach}
        title="Detach transcript"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
