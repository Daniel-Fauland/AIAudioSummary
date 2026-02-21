"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Anchor, Copy, Maximize2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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

  const getViewport = useCallback(
    () => scrollRef.current?.querySelector<HTMLDivElement>('[data-slot="scroll-area-viewport"]'),
    [],
  );

  // Auto-scroll when new content arrives
  useEffect(() => {
    if (autoScroll) {
      const vp = getViewport();
      if (vp) vp.scrollTop = vp.scrollHeight;
    }
  }, [accumulatedTranscript, currentPartial, autoScroll, getViewport]);

  // Detect user scrolling up to disable auto-scroll
  const handleScroll = useCallback(() => {
    const vp = getViewport();
    if (!vp) return;
    const { scrollTop, scrollHeight, clientHeight } = vp;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    setAutoScroll(isAtBottom);
  }, [getViewport]);

  // Attach scroll listener directly to the viewport element
  useEffect(() => {
    const vp = getViewport();
    if (!vp) return;
    vp.addEventListener("scroll", handleScroll);
    return () => vp.removeEventListener("scroll", handleScroll);
  }, [getViewport, handleScroll]);

  const hasContent = accumulatedTranscript || currentPartial;

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Live Transcript</CardTitle>
        <div className="flex items-center gap-1">
          {accumulatedTranscript && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onCopy}>
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy transcript</TooltipContent>
            </Tooltip>
          )}
          {accumulatedTranscript && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden md:inline-flex"
                  onClick={() => setFullscreen(true)}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Full screen</TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea ref={scrollRef} className="min-h-[300px] max-h-[600px] rounded-md bg-card">
          <div className="p-4 font-mono text-sm">
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
        </ScrollArea>

        {/* Scroll lock toggle */}
        {hasContent && (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 px-2 text-xs ${autoScroll ? "text-primary" : "text-foreground-muted"}`}
              onClick={() => {
                setAutoScroll(true);
                const vp = getViewport();
                if (vp) vp.scrollTop = vp.scrollHeight;
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
          <ScrollArea className="flex-1">
            <div className="whitespace-pre-wrap font-mono text-sm text-foreground p-4">
              {accumulatedTranscript}
              {currentPartial && (
                <span className="italic text-foreground-muted">{currentPartial}</span>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
