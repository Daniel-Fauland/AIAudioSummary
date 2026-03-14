"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { RefreshCw, ArrowLeft, Maximize2, Square, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,

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
  const userScrolledRef = useRef(false);

  // Track user scroll to disengage auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const vp = el.querySelector<HTMLDivElement>('[data-slot="scroll-area-viewport"]');
    if (!vp) return;

    const handleScroll = () => {
      if (!loading) return;
      const atBottom = vp.scrollHeight - vp.scrollTop - vp.clientHeight < 30;
      userScrolledRef.current = !atBottom;
    };

    vp.addEventListener("scroll", handleScroll);
    return () => vp.removeEventListener("scroll", handleScroll);
  }, [loading]);

  // Reset anchor when generation starts
  useEffect(() => {
    if (loading) userScrolledRef.current = false;
  }, [loading]);

  // Auto-scroll during streaming (only if user hasn't scrolled away)
  useEffect(() => {
    if (loading && scrollRef.current && !userScrolledRef.current) {
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
    <Card className="border-border/50 bg-card/10 backdrop-blur-md flex flex-col h-full shadow-sm transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/20 bg-background/30 backdrop-blur-sm pb-4">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg font-semibold">Summary</CardTitle>
          {!loading && <TokenUsageBadge usage={tokenUsage} contextWindow={contextWindow} />}
        </div>
        <div className="flex items-center gap-2">
          {!loading && summary ? (
            <Button
              variant="outline"
              size="icon-sm"
              className="hidden md:inline-flex text-foreground-secondary hover:text-foreground transition-all"
              onClick={() => setFullscreen(true)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          ) : null}
          {loading ? (
            <Badge
              variant="outline"
              className={`border-primary/30 bg-primary/10 text-primary transition-all duration-300 ${
                badgeHovered
                  ? "cursor-pointer border-destructive/30 bg-destructive/10 text-destructive scale-[1.02]"
                  : "glow-border-plasma"
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
                <>
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  Generating...
                </>
              )}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-4 p-6 overflow-hidden">
        <ScrollArea ref={scrollRef} className="flex-1 min-h-0 pr-4">
          <div className="pb-4">
            {summary ? (
              <div className="markdown-prose">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
                {loading ? <span className="streaming-cursor">▊</span> : null}
              </div>
            ) : loading ? (
              <div className="flex items-center gap-3 py-16 justify-center opacity-80">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></div>
                </div>
                <span className="text-sm font-mono text-info/80 tracking-widest uppercase">
                  Synthesizing Data...
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <p className="text-sm font-mono text-foreground-muted uppercase tracking-widest opacity-60">
                 Awaiting Input
                </p>
                <div className="w-12 h-[1px] bg-border/40 mt-2"></div>
              </div>
            )}
          </div>
        </ScrollArea>

        {!loading ? (
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border/20 shrink-0">
            <Button variant="outline" size="sm" className="justify-start transition-all" onClick={onRegenerate}>
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Regenerate
            </Button>
            <Button variant="outline" size="sm" className="justify-start transition-all" onClick={onBack}>
              <ArrowLeft className="mr-2 h-3.5 w-3.5" />
              Back
            </Button>
            <CopyAsButton payload={contentPayload} variant="outline" size="sm" />
            <SaveAsButton payload={contentPayload} variant="outline" size="sm" />
          </div>
        ) : null}
      </CardContent>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="sm:max-w-[95vw] h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Summary</DialogTitle>
          </DialogHeader>
          <div className="flex flex-1 min-h-0 flex-col rounded-md bg-card">
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4 markdown-prose">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
              </div>
            </ScrollArea>
            <div className="grid grid-cols-2 gap-2 p-4 pt-2 border-t border-border/20 bg-background/30 backdrop-blur-sm">
              <Button variant="outline" size="sm" className="justify-start" onClick={onRegenerate}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </Button>
              <Button variant="outline" size="sm" className="justify-start" onClick={onBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Transcript
              </Button>
              <CopyAsButton payload={contentPayload} variant="outline" size="sm" />
              <SaveAsButton payload={contentPayload} variant="outline" size="sm" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
