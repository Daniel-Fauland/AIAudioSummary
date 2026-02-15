"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Copy, FileText, RefreshCw, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface SummaryViewProps {
  summary: string;
  loading?: boolean;
  onCopy?: () => void;
  onRegenerate?: () => void;
  onBack?: () => void;
}

export function SummaryView({
  summary,
  loading,
  onCopy,
  onRegenerate,
  onBack,
}: SummaryViewProps) {
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
      toast.success("Summary copied to clipboard");
      onCopy?.();
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      toast.success("Markdown copied to clipboard");
      onCopy?.();
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Summary</CardTitle>
        {loading ? (
          <Badge
            variant="outline"
            className="border-primary-muted bg-primary-muted text-primary"
          >
            Generating...
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          ref={scrollRef}
          className="max-h-[600px] overflow-y-auto rounded-md bg-card p-4"
        >
          {summary ? (
            <div className="markdown-prose">
              <ReactMarkdown>{summary}</ReactMarkdown>
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

        {!loading && summary ? (
          <div className="grid grid-cols-2 gap-2">
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
        ) : null}
      </CardContent>
    </Card>
  );
}
