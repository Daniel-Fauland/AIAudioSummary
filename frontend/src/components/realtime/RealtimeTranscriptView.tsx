"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Anchor, Copy, Maximize2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface RealtimeTranscriptViewProps {
  accumulatedTranscript: string;
  currentPartial: string;
  isSessionActive: boolean;
  onCopy: () => void;
}

export function RealtimeTranscriptView({
  accumulatedTranscript,
  currentPartial,
  isSessionActive,
  onCopy,
}: RealtimeTranscriptViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

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
        <div className="flex items-center gap-1">
          {accumulatedTranscript && (
            <Button variant="ghost" size="icon" onClick={onCopy} title="Copy transcript">
              <Copy className="h-4 w-4" />
            </Button>
          )}
          {accumulatedTranscript && (
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:inline-flex"
              onClick={() => setFullscreen(true)}
              title="Full screen"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="min-h-[300px] max-h-[600px] overflow-y-auto rounded-md bg-card p-4 font-mono text-sm"
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
          <div className="flex justify-end">
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

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="sm:max-w-[95vw] h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Live Transcript</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto whitespace-pre-wrap font-mono text-sm text-foreground p-4">
            {accumulatedTranscript}
            {currentPartial && (
              <span className="italic text-foreground-muted">{currentPartial}</span>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
