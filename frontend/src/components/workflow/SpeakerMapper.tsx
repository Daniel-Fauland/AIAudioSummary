"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowRight, ChevronDown, ChevronRight, Loader2, RefreshCw, Sparkles, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getSpeakers, updateSpeakers } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "sonner";

interface SpeakerMapperProps {
  transcript: string;
  onTranscriptUpdate: (updatedTranscript: string) => void;
  authorSpeaker: string | null;
  onAuthorSpeakerChange: (speaker: string | null) => void;
  keyPoints: Record<string, string>;
  isExtractingKeyPoints: boolean;
  keyPointsEnabled?: boolean;
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
  keyPointsEnabled = true,
  onAutoExtractKeyPoints,
  onManualExtractKeyPoints,
  onKeyPointsRemap,
  onTranscriptReplaced,
}: SpeakerMapperProps) {
  const [speakers, setSpeakers] = useState<string[]>([]);
  const [replacements, setReplacements] = useState<Record<string, string>>({});
  const [detecting, setDetecting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [expandedSpeakers, setExpandedSpeakers] = useState<Set<string>>(new Set());

  const lastDetectedTranscript = useRef("");
  const onAutoExtractKeyPointsRef = useRef(onAutoExtractKeyPoints);
  onAutoExtractKeyPointsRef.current = onAutoExtractKeyPoints;
  const onTranscriptReplacedRef = useRef(onTranscriptReplaced);
  onTranscriptReplacedRef.current = onTranscriptReplaced;

  const previousSpeakerCountRef = useRef<number | null>(null);
  const applyingNamesRef = useRef(false);
  const wasExtractingRef = useRef(false);

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
            applyingNamesRef.current = false;
          } else if (prevCount === null) {
            if (result.length > 0) {
              onAutoExtractKeyPointsRef.current(transcript, result);
            }
          } else if (result.length !== prevCount) {
            if (result.length > 0) {
              onTranscriptReplacedRef.current(transcript, result);
            }
          }
        }
      } catch (e) {
        if (!cancelled) {
          toast.error(getErrorMessage(e, "speakers"));
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

  // Auto-expand all rows when key points finish loading
  useEffect(() => {
    if (wasExtractingRef.current && !isExtractingKeyPoints) {
      const speakersWithPoints = speakers.filter((s) => keyPoints[s]);
      if (speakersWithPoints.length > 0) {
        setExpandedSpeakers(new Set(speakersWithPoints));
      }
    }
    wasExtractingRef.current = isExtractingKeyPoints;
  }, [isExtractingKeyPoints, keyPoints, speakers]);

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
      applyingNamesRef.current = true;
      onTranscriptUpdate(updated);

      if (authorSpeaker && mappings[authorSpeaker]) {
        onAuthorSpeakerChange(mappings[authorSpeaker]);
      }

      onKeyPointsRemap(mappings);

      toast.success("Speaker names updated.");
    } catch (e) {
      toast.error(getErrorMessage(e, "speakers"));
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

  const handleGenerateKeyPoints = () => {
    if (speakers.length > 0) {
      setExpandedSpeakers(new Set());
      onManualExtractKeyPoints(transcript, speakers);
    }
  };

  const toggleExpanded = (speaker: string) => {
    setExpandedSpeakers((prev) => {
      const next = new Set(prev);
      if (next.has(speaker)) {
        next.delete(speaker);
      } else {
        next.add(speaker);
      }
      return next;
    });
  };

  const hasKeyPoints = Object.keys(keyPoints).length > 0;
  const showChevrons = hasKeyPoints || isExtractingKeyPoints;
  const speakersWithPoints = speakers.filter((s) => keyPoints[s]);
  const allExpanded =
    speakersWithPoints.length > 0 &&
    speakersWithPoints.every((s) => expandedSpeakers.has(s));

  const expandAll = () => setExpandedSpeakers(new Set(speakersWithPoints));
  const collapseAll = () => setExpandedSpeakers(new Set());

  const renderSpeakerRow = (speaker: string) => {
    const displayName = getDisplayName(speaker);
    const isAuthor = authorSpeaker === displayName;
    const isExpanded = expandedSpeakers.has(speaker);
    const hasPoints = !!keyPoints[speaker];

    return (
      <div key={speaker}>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => handleAuthorToggle(speaker)}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors ${
                  isAuthor
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card-elevated text-foreground-muted hover:border-border-hover hover:text-foreground"
                }`}
              >
                <User className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {isAuthor ? "Remove as author/POV" : "Set as author/POV"}
            </TooltipContent>
          </Tooltip>
          <span className="min-w-[100px] text-sm font-medium text-foreground-secondary">
            {speaker}
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-foreground-muted" />
          <Input
            value={replacements[speaker] ?? ""}
            onChange={(e) => {
              const newValue = e.target.value;
              setReplacements((prev) => ({ ...prev, [speaker]: newValue }));
              if (isAuthor) {
                const trimmed = newValue.trim();
                onAuthorSpeakerChange(trimmed || speaker);
              }
            }}
            placeholder="Enter name"
            className="flex-1 bg-card-elevated"
          />
          {showChevrons ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-foreground-muted hover:text-foreground"
              onClick={() => hasPoints && toggleExpanded(speaker)}
              disabled={!hasPoints}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          ) : null}
        </div>

        {/* Collapsible key points */}
        <div
          className={`grid transition-all duration-200 ${
            isExpanded && hasPoints ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className="mx-2 mb-1 mt-2 rounded-md bg-card-elevated p-3">
              <p className="text-sm leading-relaxed text-foreground-secondary">
                {keyPoints[speaker]}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Speaker Mapping</CardTitle>
            {hasKeyPoints ? (
              <Button
                variant="link"
                size="sm"
                className="mt-1 h-auto p-0 text-xs text-foreground-muted hover:text-foreground-secondary"
                onClick={allExpanded ? collapseAll : expandAll}
              >
                {allExpanded ? "Collapse All" : "Expand All"}
              </Button>
            ) : null}
          </div>
          {speakers.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateKeyPoints}
              disabled={isExtractingKeyPoints}
              className="shrink-0"
            >
              {isExtractingKeyPoints ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin md:mr-1.5" />
                  <span className="hidden md:inline">Generating...</span>
                </>
              ) : hasKeyPoints ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 md:mr-1.5" />
                  <span className="hidden md:inline">Regenerate</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 md:mr-1.5" />
                  <span className="hidden md:inline">Generate Key Points</span>
                </>
              )}
            </Button>
          ) : null}
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
            {speakers.map((speaker) => renderSpeakerRow(speaker))}

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
