"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Anchor, Maximize2, Trash2, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CopyAsButton, SaveAsButton } from "@/components/ui/ContentActions";
import { formatTimestamp, formatTranscriptWithTimestamps } from "@/components/workflow/TranscriptView";
import type { ContentPayload, TranscriptUtterance } from "@/lib/types";

interface RealtimeTranscriptViewProps {
  accumulatedTranscript: string;
  currentPartial: string;
  committedPartial: string;
  isSessionActive: boolean;
  onClear?: () => void;
  utterances?: TranscriptUtterance[];
  showTimestamps?: boolean;
  onOpenSpeakerMapper?: () => void;
  showSpeakerMapperButton?: boolean;
}

export function RealtimeTranscriptView({
  accumulatedTranscript,
  currentPartial,
  committedPartial,
  isSessionActive,
  onClear,
  utterances,
  showTimestamps,
  onOpenSpeakerMapper,
  showSpeakerMapperButton,
}: RealtimeTranscriptViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

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

  const hasContent = accumulatedTranscript || committedPartial || currentPartial;

  // Merge consecutive utterances from the same speaker into single entries
  const mergedUtterances = useMemo(() => {
    if (!utterances?.length) return [];
    const merged: TranscriptUtterance[] = [];
    for (const u of utterances) {
      const last = merged[merged.length - 1];
      if (last && last.speaker && last.speaker === u.speaker) {
        last.text = last.text + " " + u.text;
        last.end_ms = u.end_ms;
      } else {
        merged.push({ ...u });
      }
    }
    return merged;
  }, [utterances]);

  const hasTimestampedView = !!utterances?.length && !!showTimestamps;

  const contentPayload = useMemo<ContentPayload | null>(() => {
    if (!accumulatedTranscript) return null;
    const timestampedText = hasTimestampedView
      ? formatTranscriptWithTimestamps(mergedUtterances)
      : null;
    const markdown = hasTimestampedView
      ? mergedUtterances.map((u) => `${u.text}\n*${formatTimestamp(u.start_ms)} - ${formatTimestamp(u.end_ms)}*`).join("\n\n")
      : accumulatedTranscript;
    return {
      type: "transcript",
      plainText: timestampedText ?? accumulatedTranscript,
      markdown,
      fileNamePrefix: "transcript",
    };
  }, [accumulatedTranscript, hasTimestampedView, mergedUtterances]);

  return (
    <Card className="border-border flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Live Transcript</CardTitle>
        <div className="flex items-center gap-1">
          {showSpeakerMapperButton && onOpenSpeakerMapper && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onOpenSpeakerMapper}
                >
                  <Users className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Speaker Mapping</TooltipContent>
            </Tooltip>
          )}
          {accumulatedTranscript && onClear && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setConfirmClear(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear transcript</TooltipContent>
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
      <CardContent className="flex-1 flex flex-col gap-4">
        <ScrollArea ref={scrollRef} className="min-h-[300px] max-h-[600px] flex-1 rounded-md bg-card">
          <div className="p-4 font-mono text-sm leading-relaxed">
            {hasContent ? (
              <>
                {hasTimestampedView ? (
                  <div className="space-y-3">
                    {mergedUtterances.map((u, i) => (
                      <div key={i} className="border-l-2 border-border pl-3 py-1">
                        <p className="text-sm text-foreground">
                          {u.speaker && <span className="font-semibold">{u.speaker}: </span>}
                          {u.text}
                        </p>
                        <span className="text-xs text-foreground-muted">
                          {formatTimestamp(u.start_ms)} - {formatTimestamp(u.end_ms)}
                        </span>
                      </div>
                    ))}
                    {(currentPartial || committedPartial) && (
                      <div className="border-l-2 border-border/50 pl-3 py-1 opacity-60">
                        <p className="text-sm text-foreground-muted">
                          {currentPartial || committedPartial}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <span className="text-foreground">
                      {accumulatedTranscript}
                    </span>
                    {committedPartial && (
                      <span className="text-foreground">
                        {committedPartial}
                      </span>
                    )}
                    {currentPartial && (
                      <span className="text-foreground-muted">
                        {currentPartial}
                      </span>
                    )}
                  </>
                )}
              </>
            ) : (
              <p className="py-8 text-center text-sm text-foreground-muted">
                {isSessionActive ? "Waiting for speech..." : "Transcript will appear here..."}
              </p>
            )}
          </div>
        </ScrollArea>

        {/* Copy, Save & Auto-scroll */}
        {hasContent && (
          <div className="mt-auto flex items-center gap-2">
            <CopyAsButton payload={contentPayload} variant="secondary" size="default" />
            <SaveAsButton payload={contentPayload} variant="secondary" size="default" />
            <div className="ml-auto">
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
          </div>
        )}
      </CardContent>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="sm:max-w-[95vw] h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Live Transcript</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1">
            {hasTimestampedView ? (
              <div className="space-y-3 p-4">
                {utterances!.map((u, i) => (
                  <div key={i} className="border-l-2 border-border pl-3 py-1">
                    <p className="font-mono text-sm text-foreground">{u.text}</p>
                    <span className="text-xs text-foreground-muted">
                      {formatTimestamp(u.start_ms)} - {formatTimestamp(u.end_ms)}
                    </span>
                  </div>
                ))}
                {(committedPartial || currentPartial) && (
                  <div className="font-mono text-sm text-foreground leading-relaxed">
                    {committedPartial && <span>{committedPartial}</span>}
                    {currentPartial && <span className="text-foreground-muted"> {currentPartial}</span>}
                  </div>
                )}
              </div>
            ) : (
              <div className="font-mono text-sm text-foreground leading-relaxed p-4">
                {accumulatedTranscript}
                {committedPartial && ` ${committedPartial}`}
                {currentPartial && (
                  <span className="text-foreground-muted"> {currentPartial}</span>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear transcript?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the accumulated transcript. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { onClear?.(); setConfirmClear(false); }}>
              Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
