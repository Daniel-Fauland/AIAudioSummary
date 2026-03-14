"use client";

import { useState, useMemo } from "react";
import { Loader2, Maximize2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { CopyAsButton, SaveAsButton } from "@/components/ui/ContentActions";
import type { ContentPayload, TranscriptUtterance } from "@/lib/types";

export function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatTranscriptWithTimestamps(utterances: TranscriptUtterance[]): string {
  return utterances
    .map((u) => `${u.speaker}: ${u.text}\n[${formatTimestamp(u.start_ms)} - ${formatTimestamp(u.end_ms)}]`)
    .join("\n\n");
}

interface TranscriptViewProps {
  transcript: string;
  onTranscriptChange?: (transcript: string) => void;
  loading?: boolean;
  readOnly?: boolean;
  utterances?: TranscriptUtterance[];
  showTimestamps?: boolean;
}

export function TranscriptView({
  transcript,
  onTranscriptChange,
  loading,
  readOnly,
  utterances,
  showTimestamps,
}: TranscriptViewProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const hasTimestampedView = readOnly && !!utterances?.length && !!showTimestamps;

  const contentPayload = useMemo<ContentPayload | null>(() => {
    if (!transcript) return null;
    const timestampedText = hasTimestampedView
      ? formatTranscriptWithTimestamps(utterances!)
      : null;
    const markdown = hasTimestampedView
      ? utterances!.map((u) => `${u.speaker}: ${u.text}\n*${formatTimestamp(u.start_ms)} - ${formatTimestamp(u.end_ms)}*`).join("\n\n")
      : transcript;
    return {
      type: "transcript",
      plainText: timestampedText ?? transcript,
      markdown,
      fileNamePrefix: "transcript",
    };
  }, [transcript, hasTimestampedView, utterances]);

  if (loading) {
    return (
      <Card className="border-border/50 bg-card/10 backdrop-blur-md shadow-sm transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-lg">Transcript</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-foreground-secondary">
              Transcribing your audio...
            </p>
          </div>
          <div className="space-y-2">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="h-4 animate-pulse rounded bg-card-elevated"
                style={{ width: `${70 + Math.random() * 30}%` }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/10 backdrop-blur-md h-full min-h-0 overflow-hidden shadow-sm transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between shrink-0 border-b border-border/20 bg-background/30 backdrop-blur-sm pb-4">
        <CardTitle className="text-lg font-semibold">Transcript</CardTitle>
        <div className="flex items-center gap-2">
          {transcript && !readOnly ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setClearDialogOpen(true)}
                  className="text-foreground-secondary hover:text-destructive transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear transcript</TooltipContent>
            </Tooltip>
          ) : null}
          {transcript && !readOnly ? (
            <>
              <CopyAsButton payload={contentPayload} variant="outline" size="sm" />
              <SaveAsButton payload={contentPayload} variant="outline" size="sm" />
            </>
          ) : null}
          {transcript ? (
            <Button
              variant="outline"
              size="icon-sm"
              className="hidden md:inline-flex text-foreground-secondary hover:text-foreground transition-all"
              onClick={() => setFullscreen(true)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden p-6">
        {readOnly ? (
          <ScrollArea className="flex-1 min-h-0 pr-4">
            {hasTimestampedView ? (
              <div className="space-y-6">
                {utterances!.map((u, i) => (
                  <div key={i} className="pl-4 border-l-2 border-primary/30 py-1 transition-colors hover:border-primary/80">
                    <p className="font-sans text-[0.95rem] leading-relaxed text-foreground">
                      <span className="font-mono text-xs font-semibold text-primary/80 uppercase tracking-widest block mb-1">
                        {u.speaker}
                      </span>
                      {u.text}
                    </p>
                    <span className="font-mono text-[10px] text-foreground-muted block mt-2 opacity-70">
                      [{formatTimestamp(u.start_ms)} — {formatTimestamp(u.end_ms)}]
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="whitespace-pre-wrap font-sans text-[0.95rem] leading-relaxed text-foreground">
                {transcript || "Transcript will appear here..."}
              </div>
            )}
          </ScrollArea>
        ) : (
          <Textarea
            value={transcript}
            onChange={(e) => onTranscriptChange?.(e.target.value)}
            className="min-h-[300px] h-full resize-none border-border/30 bg-card/20 font-sans text-[0.95rem] leading-relaxed text-foreground focus-visible:ring-primary/40 p-4"
            placeholder="Transcript will appear here..."
          />
        )}
        {transcript && readOnly ? (
          <div className="flex flex-wrap justify-end gap-3 mt-6 shrink-0 pt-4 border-t border-border/20">
            <CopyAsButton payload={contentPayload} variant="outline" size="sm" />
            <SaveAsButton payload={contentPayload} variant="outline" size="sm" />
          </div>
        ) : null}
      </CardContent>

      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear transcript?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the transcript content. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => onTranscriptChange?.("")}
            >
              Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="sm:max-w-[95vw] h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Transcript</DialogTitle>
          </DialogHeader>
          <div className="flex flex-1 min-h-0 flex-col rounded-md bg-card">
            {readOnly ? (
              <ScrollArea className="flex-1 min-h-0">
                {hasTimestampedView ? (
                  <div className="space-y-3 p-4">
                    {utterances!.map((u, i) => (
                      <div key={i} className="border-l-2 border-border pl-3 py-1">
                        <p className="font-mono text-sm text-foreground">
                          <span className="font-semibold">{u.speaker}:</span> {u.text}
                        </p>
                        <span className="text-xs text-foreground-muted">
                          {formatTimestamp(u.start_ms)} - {formatTimestamp(u.end_ms)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap font-mono text-sm text-foreground p-4">
                    {transcript}
                  </div>
                )}
              </ScrollArea>
            ) : (
              <Textarea
                value={transcript}
                onChange={(e) => onTranscriptChange?.(e.target.value)}
                className="flex-1 resize-none bg-card-elevated font-mono text-sm text-foreground"
                placeholder="Transcript will appear here..."
              />
            )}
            <div className="grid grid-cols-2 gap-2 p-4 pt-2">
              <CopyAsButton payload={contentPayload} variant="outline" size="sm" />
              <SaveAsButton payload={contentPayload} variant="outline" size="sm" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
