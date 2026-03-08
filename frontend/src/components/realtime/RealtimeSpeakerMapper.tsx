"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowRight, ChevronDown, ChevronRight, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface RealtimeSpeakerMapperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  speakers: string[];
  onApplyMappings: (mappings: Record<string, string>) => void;
  keyPoints: Record<string, string>;
  isExtractingKeyPoints: boolean;
  onExtractKeyPoints: (speakers: string[], unmappedOnly: boolean) => void;
  suggestedNames?: Record<string, string>;
  autoKeyPointsEnabled: boolean;
  speakerLabelsEnabled: boolean;
  existingMappings: Record<string, string>;
}

export function RealtimeSpeakerMapper({
  open,
  onOpenChange,
  speakers,
  onApplyMappings,
  keyPoints,
  isExtractingKeyPoints,
  onExtractKeyPoints,
  suggestedNames,
  autoKeyPointsEnabled,
  speakerLabelsEnabled,
  existingMappings,
}: RealtimeSpeakerMapperProps) {
  const [replacements, setReplacements] = useState<Record<string, string>>({});
  const [expandedSpeakers, setExpandedSpeakers] = useState<Set<string>>(new Set());
  const wasExtractingRef = useRef(false);
  const hasAutoTriggeredRef = useRef(false);

  // Initialize replacements from existing mappings on open
  useEffect(() => {
    if (open) {
      setReplacements({ ...existingMappings });
      hasAutoTriggeredRef.current = false;
    }
  }, [open, existingMappings]);

  // Auto-trigger key points for unmapped speakers on open
  // Only considers speakers with generic labels (e.g. "Speaker A", "Speaker B")
  useEffect(() => {
    if (open && autoKeyPointsEnabled && !hasAutoTriggeredRef.current && speakers.length > 0) {
      hasAutoTriggeredRef.current = true;
      const genericPattern = /^Speaker [A-Z]$/;
      const unmapped = speakers.filter(
        (s) => genericPattern.test(s) && !existingMappings[s],
      );
      if (unmapped.length > 0) {
        onExtractKeyPoints(unmapped, true);
      }
    }
  }, [open, autoKeyPointsEnabled, speakers, existingMappings, onExtractKeyPoints]);

  // Pre-fill replacement inputs with suggested names
  useEffect(() => {
    if (!suggestedNames || Object.keys(suggestedNames).length === 0) return;
    setReplacements((prev) => {
      const updated = { ...prev };
      let changed = false;
      for (const [speaker, name] of Object.entries(suggestedNames)) {
        if (name && (!prev[speaker] || prev[speaker].trim() === "")) {
          updated[speaker] = name;
          changed = true;
        }
      }
      return changed ? updated : prev;
    });
  }, [suggestedNames]);

  // Auto-expand rows when key points finish loading
  useEffect(() => {
    if (wasExtractingRef.current && !isExtractingKeyPoints) {
      const speakersWithPoints = speakers.filter((s) => keyPoints[s]);
      if (speakersWithPoints.length > 0) {
        setExpandedSpeakers(new Set(speakersWithPoints));
      }
    }
    wasExtractingRef.current = isExtractingKeyPoints;
  }, [isExtractingKeyPoints, keyPoints, speakers]);

  const handleApply = () => {
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

    onApplyMappings(mappings);
    onOpenChange(false);
  };

  const handleGenerateKeyPoints = () => {
    if (speakers.length > 0) {
      setExpandedSpeakers(new Set());
      onExtractKeyPoints(speakers, false);
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

  const hasAnyReplacement = speakers.some(
    (s) => (replacements[s]?.trim() ?? "").length > 0,
  );

  const hasKeyPoints = Object.keys(keyPoints).length > 0;
  const showChevrons = hasKeyPoints || isExtractingKeyPoints;
  const speakersWithPoints = speakers.filter((s) => keyPoints[s]);
  const allExpanded =
    speakersWithPoints.length > 0 &&
    speakersWithPoints.every((s) => expandedSpeakers.has(s));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col bg-card">
        <DialogHeader className="shrink-0 pr-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle>Speaker Mapping</DialogTitle>
              {hasKeyPoints && (
                <Button
                  variant="link"
                  size="sm"
                  className="mt-1 h-auto p-0 text-xs text-foreground-muted hover:text-foreground-secondary"
                  onClick={allExpanded ? () => setExpandedSpeakers(new Set()) : () => setExpandedSpeakers(new Set(speakersWithPoints))}
                >
                  {allExpanded ? "Collapse All" : "Expand All"}
                </Button>
              )}
            </div>
            {speakers.length > 0 && (
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
            )}
          </div>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto flex-1 min-h-0 pr-1">
          {speakers.map((speaker) => {
            const isExpanded = expandedSpeakers.has(speaker);
            const hasPoints = !!keyPoints[speaker];

            return (
              <div key={speaker}>
                <div className="flex items-center gap-2">
                  <span className="min-w-[100px] text-sm font-medium text-foreground-secondary">
                    {speaker}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-foreground-muted" />
                  <Input
                    value={replacements[speaker] ?? ""}
                    onChange={(e) =>
                      setReplacements((prev) => ({ ...prev, [speaker]: e.target.value }))
                    }
                    placeholder="Enter name"
                    className="flex-1 bg-card-elevated"
                  />
                  {showChevrons && (
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
                  )}
                </div>

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
          })}
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!hasAnyReplacement}>
            Apply Names
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
