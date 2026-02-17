"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowRight, Loader2, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSpeakers, updateSpeakers } from "@/lib/api";
import { toast } from "sonner";

interface SpeakerMapperProps {
  transcript: string;
  onTranscriptUpdate: (updatedTranscript: string) => void;
  authorSpeaker: string | null;
  onAuthorSpeakerChange: (speaker: string | null) => void;
}

export function SpeakerMapper({
  transcript,
  onTranscriptUpdate,
  authorSpeaker,
  onAuthorSpeakerChange,
}: SpeakerMapperProps) {
  const [speakers, setSpeakers] = useState<string[]>([]);
  const [replacements, setReplacements] = useState<Record<string, string>>({});
  const [detecting, setDetecting] = useState(false);
  const [applying, setApplying] = useState(false);

  const lastDetectedTranscript = useRef("");

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
          lastDetectedTranscript.current = transcript;
          setSpeakers(result);
          setReplacements({});
          onAuthorSpeakerChange(null);
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
      onTranscriptUpdate(updated);

      // Update author if the selected author's speaker label was renamed
      if (authorSpeaker && mappings[authorSpeaker]) {
        onAuthorSpeakerChange(mappings[authorSpeaker]);
      }

      toast.success("Speaker names updated.");
      // Don't clear speakers — the transcript change will trigger re-detection
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to update speakers",
      );
    } finally {
      setApplying(false);
    }
  };

  const handleAuthorToggle = (speaker: string) => {
    // Get the display name: use replacement if set, otherwise the original speaker label
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

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-lg">Speaker Mapping</CardTitle>
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
            {speakers.map((speaker) => {
              const displayName = getDisplayName(speaker);
              const isAuthor = authorSpeaker === displayName;

              return (
                <div key={speaker} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAuthorToggle(speaker)}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors ${
                      isAuthor
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card-elevated text-foreground-muted hover:border-border-hover hover:text-foreground-secondary"
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
                      // Update author name live if this speaker is the author
                      if (isAuthor) {
                        const trimmed = newValue.trim();
                        onAuthorSpeakerChange(trimmed || speaker);
                      }
                    }}
                    placeholder="Enter name"
                    className="bg-card-elevated"
                  />
                </div>
              );
            })}

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
  );
}
