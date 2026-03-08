"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { KeytermsList } from "@/lib/types";

interface KeytermsListEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list?: KeytermsList | null;
  onSave: (list: KeytermsList) => void;
}

export function KeytermsListEditor({ open, onOpenChange, list, onSave }: KeytermsListEditorProps) {
  const isEditing = !!list;

  const [name, setName] = useState("");
  const [termsText, setTermsText] = useState("");

  useEffect(() => {
    if (open) {
      setName(list?.name ?? "");
      setTermsText(list?.terms.join("\n") ?? "");
    }
  }, [open, list]);

  const termCount = termsText.split("\n").filter((line) => line.trim().length > 0).length;

  const handleSave = useCallback(() => {
    if (!name.trim()) return;
    const terms = termsText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (terms.length === 0) return;

    const saved: KeytermsList = {
      id: list?.id ?? `keyterms:${Date.now()}`,
      name: name.trim(),
      terms,
    };

    onSave(saved);
    onOpenChange(false);
  }, [name, termsText, list, onSave, onOpenChange]);

  const canSave = name.trim().length > 0 && termCount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Keyterms List" : "Create Keyterms List"}</DialogTitle>
          <DialogDescription>
            Add domain-specific terms to improve transcription accuracy. One term per line.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
          <div className="space-y-1.5">
            <Label htmlFor="keyterms-name">List Name</Label>
            <Input
              id="keyterms-name"
              placeholder="e.g., Project Alpha, Medical Terms"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="keyterms-terms">Terms</Label>
              <span
                className={`text-xs ${
                  termCount > 1000
                    ? "text-destructive"
                    : termCount > 100
                      ? "text-warning"
                      : "text-foreground-muted"
                }`}
              >
                {termCount} term{termCount !== 1 ? "s" : ""}
                {termCount > 100 && termCount <= 1000 && <span className="ml-1">(realtime max: 100)</span>}
                {termCount > 1000 && <span className="ml-1">(max: 1000)</span>}
              </span>
            </div>
            <Textarea
              id="keyterms-terms"
              placeholder={"coccygodynie\netoricoxib\nLSTM"}
              value={termsText}
              onChange={(e) => setTermsText(e.target.value)}
              rows={10}
              className="resize-y font-mono text-sm"
            />
            <p className="text-xs text-foreground-muted">
              One term per line. Max 6 words per term for standard, 50 chars for realtime.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {isEditing ? "Save Changes" : "Create List"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
