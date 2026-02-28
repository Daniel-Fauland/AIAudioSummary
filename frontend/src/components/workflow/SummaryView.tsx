"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { RefreshCw, ArrowLeft, Maximize2, Square } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CopyAsButton, SaveAsButton } from "@/components/ui/ContentActions";
import { TokenUsageBadge } from "@/components/ui/TokenUsageBadge";
import type { ContentPayload, TokenUsage } from "@/lib/types";

interface SummaryViewProps {
  summary: string;
  loading?: boolean;
  onCopy?: () => void;
  onStop?: () => void;
  onRegenerate?: () => void;
  onBack?: () => void;
  tokenUsage?: TokenUsage | null;
  contextWindow?: number;
}

export function SummaryView({
  summary,
  loading,
  onStop,
  onRegenerate,
  onBack,
  tokenUsage,
  contextWindow,
}: SummaryViewProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [badgeHovered, setBadgeHovered] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll during streaming
  useEffect(() => {
    if (loading && scrollRef.current) {
      const vp = scrollRef.current.querySelector<HTMLDivElement>('[data-slot="scroll-area-viewport"]');
      if (vp) vp.scrollTop = vp.scrollHeight;
    }
  }, [summary, loading]);

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
    // Re-compute when summary changes or loading finishes (DOM updated)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary, loading]);

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">Summary</CardTitle>
          {!loading && <TokenUsageBadge usage={tokenUsage} contextWindow={contextWindow} />}
        </div>
        <div className="flex items-center gap-2">
          {!loading && summary ? (
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:inline-flex"
              onClick={() => setFullscreen(true)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          ) : null}
          {loading ? (
            <Badge
              variant="outline"
              className={`border-primary-muted bg-primary-muted text-primary transition-colors ${
                badgeHovered
                  ? "cursor-pointer border-destructive/30 bg-destructive/10 text-destructive"
                  : ""
              }`}
              onMouseEnter={() => setBadgeHovered(true)}
              onMouseLeave={() => setBadgeHovered(false)}
              onClick={badgeHovered ? onStop : undefined}
            >
              {badgeHovered ? (
                <>
                  <Square className="mr-1 h-3 w-3 fill-current" />
                  Stop Generating
                </>
              ) : (
                "Generating..."
              )}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea ref={scrollRef} className="max-h-[600px] rounded-md bg-card">
          <div className="p-4">
            {summary ? (
              <div className="markdown-prose">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
                {loading ? <span className="streaming-cursor">▊</span> : null}
              </div>
            ) : loading ? (
              <div className="flex items-center gap-2 py-8 justify-center">
                <span className="streaming-cursor text-lg">▊</span>
                <span className="text-sm text-foreground-secondary">
                  Waiting for response...
                </span>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-foreground-muted">
                Summary will appear here...
              </p>
            )}
          </div>
        </ScrollArea>

        {!loading ? (
          <div className="grid grid-cols-2 gap-2">
            <CopyAsButton payload={contentPayload} variant="secondary" size="default" />
            <SaveAsButton payload={contentPayload} variant="secondary" size="default" />
            <Button variant="secondary" className="justify-start" onClick={onRegenerate}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Regenerate
            </Button>
            <Button variant="ghost" className="justify-start" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Transcript
            </Button>
          </div>
        ) : null}
      </CardContent>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="sm:max-w-[95vw] h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Summary</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 rounded-md bg-card">
            <div className="p-4 markdown-prose">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
            </div>
          </ScrollArea>
          <DialogFooter className="sm:justify-start">
            <div className="grid w-full grid-cols-2 gap-2">
              <CopyAsButton payload={contentPayload} variant="secondary" size="default" />
              <SaveAsButton payload={contentPayload} variant="secondary" size="default" />
              <Button variant="secondary" className="justify-start" onClick={onRegenerate}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </Button>
              <Button variant="ghost" className="justify-start" onClick={onBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Transcript
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
