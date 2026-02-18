"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, FileText, RefreshCw, ArrowLeft, Maximize2, Square } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface SummaryViewProps {
  summary: string;
  loading?: boolean;
  onCopy?: () => void;
  onStop?: () => void;
  onRegenerate?: () => void;
  onBack?: () => void;
}

export function SummaryView({
  summary,
  loading,
  onCopy,
  onStop,
  onRegenerate,
  onBack,
}: SummaryViewProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [badgeHovered, setBadgeHovered] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll during streaming
  useEffect(() => {
    if (loading && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [summary, loading]);

  const handleCopyFormatted = async () => {
    try {
      const proseEl = scrollRef.current?.querySelector(".markdown-prose");
      if (proseEl) {
        const html = proseEl.innerHTML;
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([summary], { type: "text/plain" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(summary);
      }
      toast.success("Summary copied to clipboard", { position: "bottom-center" });
      onCopy?.();
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      toast.success("Markdown copied to clipboard", { position: "bottom-center" });
      onCopy?.();
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Summary</CardTitle>
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
        <div
          ref={scrollRef}
          className="max-h-[600px] overflow-y-auto rounded-md bg-card p-4"
        >
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

        {!loading ? (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" className="justify-start" onClick={handleCopyFormatted} disabled={!summary}>
              <Copy className="mr-2 h-4 w-4" />
              Copy Summary
            </Button>
            <Button variant="secondary" className="justify-start" onClick={handleCopyMarkdown} disabled={!summary}>
              <FileText className="mr-2 h-4 w-4" />
              Copy as Markdown
            </Button>
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
          <div className="flex-1 overflow-y-auto rounded-md bg-card p-4">
            <div className="markdown-prose">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
            </div>
          </div>
          <DialogFooter className="sm:justify-start">
            <div className="grid w-full grid-cols-2 gap-2">
              <Button variant="secondary" className="justify-start" onClick={handleCopyFormatted}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Summary
              </Button>
              <Button variant="secondary" className="justify-start" onClick={handleCopyMarkdown}>
                <FileText className="mr-2 h-4 w-4" />
                Copy as Markdown
              </Button>
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
