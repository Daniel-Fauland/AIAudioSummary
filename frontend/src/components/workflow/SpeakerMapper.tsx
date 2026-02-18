"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowRight, Info, Loader2, RefreshCw, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getSpeakers, updateSpeakers } from "@/lib/api";
import { toast } from "sonner";

interface SpeakerMapperProps {
  transcript: string;
  onTranscriptUpdate: (updatedTranscript: string) => void;
  authorSpeaker: string | null;
  onAuthorSpeakerChange: (speaker: string | null) => void;
  keyPoints: Record<string, string>;
  isExtractingKeyPoints: boolean;
  onAutoExtractKeyPoints: (transcript: string, speakers: string[]) => void;
  onManualExtractKeyPoints: (transcript: string, speakers: string[]) => void;
  onKeyPointsRemap: (mappings: Record<string, string>) => void;
  onTranscriptReplaced: (transcript: string, speakers: string[]) => void;
}

export function SpeakerMapper({
  transcript,
  onTranscriptUpdate,
  authorSpeaker,
  onAuthorSpeakerChange,
  keyPoints,
  isExtractingKeyPoints,
  onAutoExtractKeyPoints,
  onManualExtractKeyPoints,
  onKeyPointsRemap,
  onTranscriptReplaced,
}: SpeakerMapperProps) {
  const [speakers, setSpeakers] = useState<string[]>([]);
  const [replacements, setReplacements] = useState<Record<string, string>>({});
  const [detecting, setDetecting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const lastDetectedTranscript = useRef("");
  const onAutoExtractKeyPointsRef = useRef(onAutoExtractKeyPoints);
  onAutoExtractKeyPointsRef.current = onAutoExtractKeyPoints;
  const onTranscriptReplacedRef = useRef(onTranscriptReplaced);
  onTranscriptReplacedRef.current = onTranscriptReplaced;

  // Tracks the last known speaker count to detect transcript replacements
  const previousSpeakerCountRef = useRef<number | null>(null);
  // Set to true in handleApply so the useEffect knows to skip auto-extract
  const applyingNamesRef = useRef(false);

  // Auto-detect speakers whenever the transcript changes (debounced 500ms)
  useEffect(() => {
    if (!transcript || transcript === lastDetectedTranscript.current) {
      return;
    }

    let cancelled = false;

    const timeoutId = setTimeout(async () => {
      setDetecting(true);
      try {
        const result = await getSpeakers(transcript);
        if (!cancelled) {
          const prevCount = previousSpeakerCountRef.current;
          previousSpeakerCountRef.current = result.length;
          lastDetectedTranscript.current = transcript;
          setSpeakers(result);
          setReplacements({});
          onAuthorSpeakerChange(null);

          if (applyingNamesRef.current) {
            // Transcript changed because "Apply Names" was clicked — do not
            // re-trigger key point extraction, just clear the flag.
            applyingNamesRef.current = false;
          } else if (prevCount === null) {
            // First detection for this component instance (fresh transcript).
            if (result.length > 0) {
              onAutoExtractKeyPointsRef.current(transcript, result);
            }
          } else if (result.length !== prevCount) {
            // Speaker count changed → treat as a replaced transcript.
            if (result.length > 0) {
              onTranscriptReplacedRef.current(transcript, result);
            }
          }
          // else: same count, not Apply Names → transcript was edited in-place;
          // do not re-trigger auto-extraction.
        }
      } catch (e) {
        if (!cancelled) {
          toast.error(
            e instanceof Error ? e.message : "Failed to detect speakers",
          );
        }
      } finally {
        if (!cancelled) {
          setDetecting(false);
        }
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [transcript, onAuthorSpeakerChange]);

  const handleApply = async () => {
    const mappings: Record<string, string> = {};
    for (const speaker of speakers) {
      const replacement = replacements[speaker]?.trim();
      if (replacement) {
        mappings[speaker] = replacement;
      }
    }

    if (Object.keys(mappings).length === 0) {
      toast.info("Enter at least one replacement name.");
      return;
    }

    setApplying(true);
    try {
      const updated = await updateSpeakers(transcript, mappings);
      // Signal the useEffect that the upcoming transcript change is only a
      // label rename, not a new transcript — key point extraction must not fire.
      applyingNamesRef.current = true;
      onTranscriptUpdate(updated);

      // Update author if the selected author's speaker label was renamed
      if (authorSpeaker && mappings[authorSpeaker]) {
        onAuthorSpeakerChange(mappings[authorSpeaker]);
      }

      // Remap key points to use new speaker names
      onKeyPointsRemap(mappings);

      toast.success("Speaker names updated.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to update speakers",
      );
    } finally {
      setApplying(false);
    }
  };

  const handleAuthorToggle = (speaker: string) => {
    const displayName = replacements[speaker]?.trim() || speaker;
    if (authorSpeaker === displayName) {
      onAuthorSpeakerChange(null);
    } else {
      onAuthorSpeakerChange(displayName);
    }
  };

  const getDisplayName = (speaker: string): string => {
    return replacements[speaker]?.trim() || speaker;
  };

  const hasAnyReplacement = speakers.some(
    (s) => (replacements[s]?.trim() ?? "").length > 0,
  );

  const handleRefreshKeyPoints = () => {
    if (speakers.length > 0) {
      onManualExtractKeyPoints(transcript, speakers);
    }
  };

  const renderSpeakerRow = (speaker: string, showKeyPoints: boolean) => {
    const displayName = getDisplayName(speaker);
    const isAuthor = authorSpeaker === displayName;

    return (
      <div key={speaker} className="space-y-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleAuthorToggle(speaker)}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors ${
              isAuthor
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card-elevated text-foreground-muted hover:border-border-hover hover:text-foreground"
            }`}
            title={
              isAuthor
                ? "Remove as author/POV"
                : "Set as author/POV"
            }
          >
            <User className="h-4 w-4" />
          </button>
          <span className="min-w-[100px] text-sm font-medium text-foreground-secondary">
            {speaker}
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-foreground-muted" />
          <Input
            value={replacements[speaker] ?? ""}
            onChange={(e) => {
              const newValue = e.target.value;
              setReplacements((prev) => ({
                ...prev,
                [speaker]: newValue,
              }));
              if (isAuthor) {
                const trimmed = newValue.trim();
                onAuthorSpeakerChange(trimmed || speaker);
              }
            }}
            placeholder="Enter name"
            className="bg-card-elevated"
          />
        </div>
        {showKeyPoints ? (
          <div className="ml-10 pl-0.5">
            {isExtractingKeyPoints && !keyPoints[speaker] ? (
              <div className="h-3 w-3/4 animate-pulse rounded bg-card-elevated" />
            ) : keyPoints[speaker] ? (
              <p className="text-xs text-foreground-muted">
                {keyPoints[speaker]}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <>
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Speaker Mapping</CardTitle>
            <div className="flex items-center gap-2">
              {isExtractingKeyPoints ? (
                <Badge variant="outline" className="gap-1.5 text-xs border-primary text-primary">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Extracting key points...
                </Badge>
              ) : null}
              {speakers.length > 0 ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFullscreen(true)}
                  className={`transition-colors hover:text-primary ${Object.keys(keyPoints).length > 0 ? "text-foreground" : "text-foreground-muted"}`}
                  title="Speaker details"
                >
                  <Info className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {detecting ? (
            <div className="flex items-center gap-2 text-sm text-foreground-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              Detecting speakers...
            </div>
          ) : null}

          {!detecting && speakers.length === 0 && transcript ? (
            <p className="text-sm text-foreground-muted">
              No speakers detected in the transcript.
            </p>
          ) : null}

          {speakers.length > 0 ? (
            <div className="space-y-3">
              {speakers.map((speaker) => renderSpeakerRow(speaker, false))}

              {authorSpeaker ? (
                <p className="text-xs text-foreground-muted">
                  <User className="mr-1 inline h-3 w-3" />
                  <span className="font-medium text-foreground-secondary">
                    {authorSpeaker}
                  </span>{" "}
                  is set as author/POV for the summary.
                </p>
              ) : null}

              <Button
                onClick={handleApply}
                disabled={applying || !hasAnyReplacement}
                className="hover:bg-primary/75"
              >
                {applying ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Apply Names
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="sm:max-w-[95vw] h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <DialogTitle>Speaker Mapping</DialogTitle>
              <div className="flex items-center gap-2">
                {isExtractingKeyPoints ? (
                  <Badge variant="secondary" className="gap-1.5 text-xs">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Extracting key points
                  </Badge>
                ) : null}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRefreshKeyPoints}
                  disabled={isExtractingKeyPoints || speakers.length === 0}
                  className="text-foreground transition-colors hover:text-primary"
                  title="Refresh key points"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4">
            {speakers.map((speaker) => renderSpeakerRow(speaker, true))}

            {authorSpeaker ? (
              <p className="text-xs text-foreground-muted">
                <User className="mr-1 inline h-3 w-3" />
                <span className="font-medium text-foreground-secondary">
                  {authorSpeaker}
                </span>{" "}
                is set as author/POV for the summary.
              </p>
            ) : null}
          </div>
          <div className="pt-4 border-t border-border">
            <Button
              onClick={handleApply}
              disabled={applying || !hasAnyReplacement}
              className="hover:bg-primary/75"
            >
              {applying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Apply Names
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
