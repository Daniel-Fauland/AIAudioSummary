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

/** Normalize text to lowercase words for fuzzy overlap comparison. */
function toWords(text: string): string[] {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").split(/\s+/).filter(Boolean);
}

/**
 * When AssemblyAI assigns the start of a new speaker's speech to the previous
 * speaker (no pause between them), the previous utterance's text ends with words
 * that also appear at the start of the new utterance. This function detects that
 * overlap (minimum 3 words) and trims it from the previous utterance.
 */
function trimSpeakerOverlap(prev: TranscriptUtterance, next: TranscriptUtterance) {
  const MIN_OVERLAP = 2;
  const prevWords = toWords(prev.text);
  const nextWords = toWords(next.text);
  if (prevWords.length < MIN_OVERLAP || nextWords.length < MIN_OVERLAP) return;

  // Find the longest suffix of prevWords that matches a prefix of nextWords
  const maxCheck = Math.min(prevWords.length, nextWords.length);
  let bestOverlap = 0;
  for (let len = MIN_OVERLAP; len <= maxCheck; len++) {
    const prevSuffix = prevWords.slice(-len);
    const nextPrefix = nextWords.slice(0, len);
    if (prevSuffix.every((w, i) => w === nextPrefix[i])) {
      bestOverlap = len;
    }
  }

  if (bestOverlap >= MIN_OVERLAP) {
    // Trim the overlapping words from the end of prev.text.
    const originalWords = prev.text.split(/\s+/);
    prev.text = originalWords.slice(0, originalWords.length - bestOverlap).join(" ");
  }
}

interface RealtimeTranscriptViewProps {
  accumulatedTranscript: string;
  currentPartial: string;
  committedPartial: string;
  isSessionActive: boolean;
  onClear?: () => void;
  utterances?: TranscriptUtterance[];
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

  // Merge consecutive utterances from the same speaker into single entries.
  // Also merge speakerless utterances into the preceding block (they belong
  // to the same speaker but arrived without a label from the backend).
  // When a speaker changes, trim overlapping text at the boundary caused by
  // AssemblyAI attributing the start of a new speaker's speech to the previous one.
  const mergedUtterances = useMemo(() => {
    if (!utterances?.length) return [];
    const merged: TranscriptUtterance[] = [];
    for (const u of utterances) {
      const last = merged[merged.length - 1];
      const sameSpeaker = last && last.speaker === u.speaker;
      const inheritsFromPrev = last && !u.speaker;
      if (sameSpeaker || inheritsFromPrev) {
        last!.text = last!.text + " " + u.text;
        last!.end_ms = u.end_ms;
      } else {
        // On speaker change, trim overlapping text from the previous block.
        if (last && last.speaker && u.speaker && last.speaker !== u.speaker) {
          trimSpeakerOverlap(last, u);
        }
        merged.push({ ...u });
      }
    }
    return merged;
  }, [utterances]);

  // Use timestamped view only when there are speaker labels (precise mode).
  // In fast mode (no speakers), progressive finals cause flickering in the block view.
  const hasSpeakerLabels = !!utterances?.some((u) => !!u.speaker);
  const hasTimestampedView = !!utterances?.length && hasSpeakerLabels;

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
    <Card className="border-border/50 bg-card/10 backdrop-blur-md flex flex-col shadow-sm transition-all duration-300 h-full">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/20 bg-background/30 backdrop-blur-sm pb-4">
        <CardTitle className="text-lg font-semibold">Live Transcript</CardTitle>
        <div className="flex items-center gap-1">
          {showSpeakerMapperButton && onOpenSpeakerMapper && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={onOpenSpeakerMapper}
                  className="text-foreground-secondary hover:text-primary transition-all"
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
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setConfirmClear(true)}
                  className="text-foreground-secondary hover:text-destructive transition-all"
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
                  variant="outline"
                  size="icon-sm"
                  className="hidden md:inline-flex text-foreground-secondary hover:text-foreground transition-all"
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
                        {" "}{committedPartial}
                      </span>
                    )}
                    {(() => {
                      if (!currentPartial) return null;
                      // In fast mode, the partial is a progressive turn whose beginning
                      // may already be committed into accumulatedTranscript.
                      // Find the longest prefix of currentPartial that matches a suffix
                      // of accumulatedTranscript, then show only the remainder.
                      let novel = currentPartial;
                      if (accumulatedTranscript && currentPartial.length > 0) {
                        // Only check up to currentPartial length at the tail of accumulated
                        const tailLen = Math.min(accumulatedTranscript.length, currentPartial.length);
                        const tail = accumulatedTranscript.slice(-tailLen);
                        // Try matching progressively longer suffixes of tail against prefixes of partial
                        let best = 0;
                        for (let i = tail.length - 1; i >= 0; i--) {
                          const suffix = tail.slice(i);
                          if (currentPartial.startsWith(suffix)) {
                            best = suffix.length;
                            break;
                          }
                        }
                        if (best > 0) novel = currentPartial.slice(best);
                      }
                      if (!novel.trim()) return null;
                      return (
                        <span className="text-foreground-muted">
                          {novel.startsWith(" ") ? "" : " "}{novel}
                        </span>
                      );
                    })()}
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
            <CopyAsButton payload={contentPayload} variant="outline" size="sm" />
            <SaveAsButton payload={contentPayload} variant="outline" size="sm" />
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
          <div className="flex flex-1 min-h-0 flex-col rounded-md bg-card">
            <ScrollArea className="flex-1 min-h-0">
              {hasTimestampedView ? (
                <div className="space-y-3 p-4">
                  {mergedUtterances.map((u, i) => (
                    <div key={i} className="border-l-2 border-border pl-3 py-1">
                      <p className="font-mono text-sm text-foreground">
                        {u.speaker && <span className="font-semibold">{u.speaker}: </span>}
                        {u.text}
                      </p>
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
            <div className="grid grid-cols-2 gap-2 p-4 pt-2">
              <CopyAsButton payload={contentPayload} variant="outline" size="sm" />
              <SaveAsButton payload={contentPayload} variant="outline" size="sm" />
            </div>
          </div>
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
