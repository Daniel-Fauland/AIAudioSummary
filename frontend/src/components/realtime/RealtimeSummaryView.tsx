"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2, Maximize2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Button } from "@/components/ui/button";
import { CopyAsButton, SaveAsButton } from "@/components/ui/ContentActions";
import { TokenUsageBadge } from "@/components/ui/TokenUsageBadge";
import type { ContentPayload, TokenUsage } from "@/lib/types";

interface RealtimeSummaryViewProps {
  summary: string;
  summaryUpdatedAt: string | null;
  isSummaryUpdating: boolean;
  isSessionEnded: boolean;
  onClear?: () => void;
  tokenUsage?: TokenUsage | null;
  lastRequestUsage?: TokenUsage | null;
  contextWindow?: number;
}

function getRelativeTime(isoTimestamp: string): string {
  const diff = Date.now() - new Date(isoTimestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes === 1) return "1m ago";
  return `${minutes}m ago`;
}

export function RealtimeSummaryView({
  summary,
  summaryUpdatedAt,
  isSummaryUpdating,
  isSessionEnded,
  onClear,
  tokenUsage,
  lastRequestUsage,
  contextWindow,
}: RealtimeSummaryViewProps) {
  const [relativeTime, setRelativeTime] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Update relative time every 30s
  useEffect(() => {
    if (!summaryUpdatedAt) return;
    setRelativeTime(getRelativeTime(summaryUpdatedAt));
    const interval = setInterval(() => {
      setRelativeTime(getRelativeTime(summaryUpdatedAt));
    }, 30000);
    return () => clearInterval(interval);
  }, [summaryUpdatedAt]);

  const contentPayload = useMemo<ContentPayload | null>(() => {
    if (!summary) return null;
    const proseEl = scrollRef.current?.querySelector(".markdown-prose");
    return {
      type: "summary",
      plainText: summary,
      markdown: summary,
      html: proseEl?.innerHTML,
      fileNamePrefix: "summary",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary, isSummaryUpdating]);

  return (
    <Card className="border-border flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">Summary</CardTitle>
          <TokenUsageBadge usage={tokenUsage} lastRequestUsage={lastRequestUsage} contextWindow={contextWindow} />
        </div>
        <div className="flex items-center gap-2">
          {isSummaryUpdating && (
            <Badge variant="outline" className="border-primary-muted bg-primary-muted text-primary">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Updating...
            </Badge>
          )}
          {summaryUpdatedAt && !isSummaryUpdating && (
            <span className="text-xs text-foreground-muted">
              Last updated: {relativeTime}
            </span>
          )}
          {summary && onClear && (
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
              <TooltipContent>Clear summary</TooltipContent>
            </Tooltip>
          )}
          {summary && (
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
        <ScrollArea ref={scrollRef} className="max-h-[600px] flex-1 rounded-md bg-card">
          <div className="p-4">
            {summary ? (
              <div className="markdown-prose summary-fade-enter" key={summaryUpdatedAt}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-foreground-muted">
                Summary will appear after the first interval...
              </p>
            )}
          </div>
        </ScrollArea>

        {/* Copy & Save buttons */}
        {!!summary && (
          <div className="mt-auto flex items-center gap-2">
            <CopyAsButton payload={contentPayload} variant="secondary" size="default" />
            <SaveAsButton payload={contentPayload} variant="secondary" size="default" />
          </div>
        )}
      </CardContent>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="sm:max-w-[95vw] h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Summary</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 markdown-prose">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear summary?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the current summary. A new summary will be generated at the next interval.
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
