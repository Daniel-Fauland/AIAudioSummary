"use client";

import { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, FileText, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface RealtimeSummaryViewProps {
  summary: string;
  summaryUpdatedAt: string | null;
  isSummaryUpdating: boolean;
  isSessionEnded: boolean;
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
}: RealtimeSummaryViewProps) {
  const [relativeTime, setRelativeTime] = useState("");
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
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      toast.success("Markdown copied to clipboard", { position: "bottom-center" });
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Summary</CardTitle>
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
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          ref={scrollRef}
          className="max-h-[600px] overflow-y-auto rounded-md bg-card p-4"
        >
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

        {/* Copy buttons after session ends */}
        {isSessionEnded && summary && (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" className="justify-start" onClick={handleCopyFormatted}>
              <Copy className="mr-2 h-4 w-4" />
              Copy Summary
            </Button>
            <Button variant="secondary" className="justify-start" onClick={handleCopyMarkdown}>
              <FileText className="mr-2 h-4 w-4" />
              Copy as Markdown
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
