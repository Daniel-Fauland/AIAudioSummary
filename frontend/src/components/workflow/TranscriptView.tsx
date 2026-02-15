"use client";

import { useState } from "react";
import { Loader2, Copy, Maximize2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface TranscriptViewProps {
  transcript: string;
  onTranscriptChange?: (transcript: string) => void;
  loading?: boolean;
  readOnly?: boolean;
}

export function TranscriptView({
  transcript,
  onTranscriptChange,
  loading,
  readOnly,
}: TranscriptViewProps) {
  const [fullscreen, setFullscreen] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(transcript);
      toast.success("Transcript copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  if (loading) {
    return (
      <Card className="border-border">
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
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Transcript</CardTitle>
        <div className="flex items-center gap-2">
          {transcript ? (
            <Button variant="secondary" size="sm" onClick={handleCopy}>
              <Copy className="mr-2 h-4 w-4" />
              Copy Transcript
            </Button>
          ) : null}
          {readOnly && transcript ? (
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:inline-flex"
              onClick={() => setFullscreen(true)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {readOnly ? (
          <div className="max-h-[600px] min-h-[300px] overflow-y-auto whitespace-pre-wrap font-mono text-sm text-foreground">
            {transcript || "Transcript will appear here..."}
          </div>
        ) : (
          <Textarea
            value={transcript}
            onChange={(e) => onTranscriptChange?.(e.target.value)}
            className="min-h-[300px] max-h-[500px] resize-none bg-card-elevated font-mono text-sm"
            placeholder="Transcript will appear here..."
          />
        )}
      </CardContent>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="sm:max-w-[95vw] h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Transcript</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto whitespace-pre-wrap font-mono text-sm text-foreground p-4">
            {transcript}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
