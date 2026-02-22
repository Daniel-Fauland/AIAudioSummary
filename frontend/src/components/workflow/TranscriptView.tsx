"use client";

import { useState } from "react";
import { Loader2, Copy, Maximize2, Trash2 } from "lucide-react";
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
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(transcript);
      toast.success("Transcript copied to clipboard", { position: "bottom-center" });
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
          {transcript && !readOnly ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setClearDialogOpen(true)}
                  className="text-foreground-secondary hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear transcript</TooltipContent>
            </Tooltip>
          ) : null}
          {transcript ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopy}
                  className="text-foreground-secondary hover:text-foreground"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy transcript</TooltipContent>
            </Tooltip>
          ) : null}
          {transcript ? (
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:inline-flex text-foreground-secondary hover:text-foreground"
              onClick={() => setFullscreen(true)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {readOnly ? (
          <ScrollArea className="max-h-[600px] min-h-[300px]">
            <div className="whitespace-pre-wrap font-mono text-sm text-foreground">
              {transcript || "Transcript will appear here..."}
            </div>
          </ScrollArea>
        ) : (
          <Textarea
            value={transcript}
            onChange={(e) => onTranscriptChange?.(e.target.value)}
            className="min-h-[300px] max-h-[500px] resize-none bg-card-elevated font-mono text-sm text-foreground"
            placeholder="Transcript will appear here..."
          />
        )}
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
          {readOnly ? (
            <ScrollArea className="flex-1">
              <div className="whitespace-pre-wrap font-mono text-sm text-foreground p-4">
                {transcript}
              </div>
            </ScrollArea>
          ) : (
            <Textarea
              value={transcript}
              onChange={(e) => onTranscriptChange?.(e.target.value)}
              className="flex-1 resize-none bg-card-elevated font-mono text-sm text-foreground"
              placeholder="Transcript will appear here..."
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
