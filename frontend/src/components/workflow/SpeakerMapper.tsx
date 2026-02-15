"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSpeakers, updateSpeakers } from "@/lib/api";
import { toast } from "sonner";

interface SpeakerMapperProps {
  transcript: string;
  onTranscriptUpdate: (updatedTranscript: string) => void;
}

export function SpeakerMapper({
  transcript,
  onTranscriptUpdate,
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
  }, [transcript]);

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
            {speakers.map((speaker) => (
              <div key={speaker} className="flex items-center gap-2">
                <span className="min-w-[100px] text-sm font-medium text-foreground-secondary">
                  {speaker}
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-foreground-muted" />
                <Input
                  value={replacements[speaker] ?? ""}
                  onChange={(e) =>
                    setReplacements((prev) => ({
                      ...prev,
                      [speaker]: e.target.value,
                    }))
                  }
                  placeholder="Enter name"
                  className="bg-card-elevated"
                />
              </div>
            ))}
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
