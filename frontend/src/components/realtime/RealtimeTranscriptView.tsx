"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Anchor } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface RealtimeTranscriptViewProps {
  accumulatedTranscript: string;
  currentPartial: string;
  isSessionActive: boolean;
}

export function RealtimeTranscriptView({
  accumulatedTranscript,
  currentPartial,
  isSessionActive,
}: RealtimeTranscriptViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll when new content arrives
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [accumulatedTranscript, currentPartial, autoScroll]);

  // Detect user scrolling up to disable auto-scroll
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    setAutoScroll(isAtBottom);
  }, []);

  const hasContent = accumulatedTranscript || currentPartial;

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Live Transcript</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="relative min-h-[300px] max-h-[500px] overflow-y-auto rounded-md bg-card-elevated p-4 font-mono text-sm"
        >
          {hasContent ? (
            <>
              <span className="whitespace-pre-wrap text-foreground">
                {accumulatedTranscript}
              </span>
              {currentPartial && (
                <span className="whitespace-pre-wrap italic text-foreground-muted">
                  {currentPartial}
                </span>
              )}
            </>
          ) : (
            <p className="py-8 text-center text-sm text-foreground-muted">
              {isSessionActive ? "Waiting for speech..." : "Transcript will appear here..."}
            </p>
          )}
        </div>

        {/* Scroll lock toggle */}
        {hasContent && (
          <div className="flex justify-end mt-2">
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 px-2 text-xs ${autoScroll ? "text-primary" : "text-foreground-muted"}`}
              onClick={() => {
                setAutoScroll(true);
                if (scrollRef.current) {
                  scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
              }}
            >
              <Anchor className="mr-1 h-3 w-3" />
              Auto-scroll
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
