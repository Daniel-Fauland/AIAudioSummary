"use client";

import { useMemo, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AssistantQuestion } from "@/lib/types";

const CUSTOM_SENTINEL = "__custom__";

// ─── Single Select ────────────────────────────────────────────────────────────

interface SingleSelectProps {
  question: AssistantQuestion;
  value: string;
  onChange: (value: string) => void;
}

function SingleSelectField({ question, value, onChange }: SingleSelectProps) {
  const options = question.options ?? [];
  const isCustomValue = value !== "" && !options.includes(value);

  // mode: "select" = predefined dropdown, "editing" = typing custom, "custom" = showing saved custom
  type Mode = "select" | "editing" | "custom";
  const [mode, setMode] = useState<Mode>(isCustomValue ? "custom" : "select");
  const [draft, setDraft] = useState(isCustomValue ? value : "");

  const confirmCustom = () => {
    const text = draft.trim();
    if (!text) return;
    onChange(text);
    setMode("custom");
  };

  if (mode === "editing") {
    return (
      <div className="space-y-1.5">
        <div className="flex gap-1.5">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Enter custom value..."
            className="flex-1 bg-card-elevated text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmCustom();
              if (e.key === "Escape") {
                if (isCustomValue) {
                  setDraft(value);
                  setMode("custom");
                } else {
                  setDraft("");
                  setMode("select");
                }
              }
            }}
          />
          <Button size="icon" variant="ghost" className="h-10 w-10 shrink-0" onClick={confirmCustom}>
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 shrink-0"
            onClick={() => {
              if (isCustomValue) { setDraft(value); setMode("custom"); }
              else { setDraft(""); setMode("select"); }
            }}
          >
            <X className="h-4 w-4 text-foreground-muted" />
          </Button>
        </div>
        <button
          type="button"
          className="text-xs text-foreground-muted underline hover:text-foreground-secondary"
          onClick={() => {
            onChange(options[0] ?? "");
            setDraft("");
            setMode("select");
          }}
        >
          Choose from predefined options
        </button>
      </div>
    );
  }

  if (mode === "custom") {
    return (
      <div className="space-y-1.5">
        <div className="flex h-10 items-center gap-2 rounded-md border border-border bg-card-elevated px-3">
          <span className="flex-1 truncate text-sm text-foreground">{value}</span>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0"
            onClick={() => { setDraft(value); setMode("editing"); }}
          >
            <Pencil className="h-3.5 w-3.5 text-foreground-muted" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0"
            onClick={() => { onChange(options[0] ?? ""); setDraft(""); setMode("select"); }}
          >
            <X className="h-3.5 w-3.5 text-foreground-muted" />
          </Button>
        </div>
        <button
          type="button"
          className="text-xs text-foreground-muted underline hover:text-foreground-secondary"
          onClick={() => { onChange(options[0] ?? ""); setDraft(""); setMode("select"); }}
        >
          Choose from predefined options
        </button>
      </div>
    );
  }

  // mode === "select"
  return (
    <Select
      value={value}
      onValueChange={(val) => {
        if (val === CUSTOM_SENTINEL) {
          setDraft("");
          setMode("editing");
        } else {
          onChange(val);
        }
      }}
    >
      <SelectTrigger className="bg-card-elevated">
        <SelectValue placeholder="Select an option..." />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
        <SelectItem value={CUSTOM_SENTINEL}>
          <span className="text-foreground-muted">Other (custom)...</span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

// ─── Multi Select ─────────────────────────────────────────────────────────────

interface MultiSelectProps {
  question: AssistantQuestion;
  value: string[];
  onChange: (value: string[]) => void;
}

function MultiSelectField({ question, value, onChange }: MultiSelectProps) {
  const builtinOptions = question.options ?? [];

  const builtinSelected = useMemo(
    () => value.filter((v) => builtinOptions.includes(v)),
    [value, builtinOptions],
  );

  const customValues = useMemo(
    () => value.filter((v) => !builtinOptions.includes(v)),
    [value, builtinOptions],
  );

  const [showAddInput, setShowAddInput] = useState(false);
  const [newItemText, setNewItemText] = useState("");
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const toggleBuiltin = (option: string, checked: boolean) => {
    if (checked) {
      onChange([...builtinSelected, option, ...customValues]);
    } else {
      onChange([...builtinSelected.filter((v) => v !== option), ...customValues]);
    }
  };

  const addCustomItem = () => {
    const text = newItemText.trim();
    if (!text || value.includes(text)) return;
    onChange([...value, text]);
    setNewItemText("");
    setShowAddInput(false);
  };

  const removeCustomItem = (item: string) => {
    onChange(value.filter((v) => v !== item));
  };

  const updateCustomItem = (oldItem: string) => {
    const text = editText.trim();
    if (!text) return;
    onChange(value.map((v) => (v === oldItem ? text : v)));
    setEditingItem(null);
    setEditText("");
  };

  return (
    <div className="space-y-2">
      {/* Built-in options */}
      {builtinOptions.map((option) => (
        <div key={option} className="flex items-center gap-2">
          <Checkbox
            id={`${question.id}-${option}`}
            checked={builtinSelected.includes(option)}
            onCheckedChange={(checked) => toggleBuiltin(option, !!checked)}
          />
          <Label
            htmlFor={`${question.id}-${option}`}
            className="cursor-pointer text-sm font-normal text-foreground-secondary"
          >
            {option}
          </Label>
        </div>
      ))}

      {/* Divider before custom items */}
      {customValues.length > 0 && builtinOptions.length > 0 && (
        <div className="border-t border-border pt-1" />
      )}

      {/* Custom items */}
      {customValues.map((item) =>
        editingItem === item ? (
          <div key={item} className="flex items-center gap-1.5">
            <div className="h-4 w-4 shrink-0" />
            <Input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="h-8 flex-1 bg-card-elevated text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") updateCustomItem(item);
                if (e.key === "Escape") { setEditingItem(null); setEditText(""); }
              }}
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0"
              onClick={() => updateCustomItem(item)}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0"
              onClick={() => { setEditingItem(null); setEditText(""); }}
            >
              <X className="h-3.5 w-3.5 text-foreground-muted" />
            </Button>
          </div>
        ) : (
          <div key={item} className="group flex items-center gap-2">
            <Checkbox
              id={`${question.id}-custom-${item}`}
              checked
              onCheckedChange={(checked) => {
                if (!checked) removeCustomItem(item);
              }}
            />
            <Label
              htmlFor={`${question.id}-custom-${item}`}
              className="flex-1 cursor-pointer text-sm font-normal text-foreground-secondary"
            >
              {item}
            </Label>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={() => { setEditingItem(item); setEditText(item); }}
            >
              <Pencil className="h-3 w-3 text-foreground-muted" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={() => removeCustomItem(item)}
            >
              <Trash2 className="h-3 w-3 text-foreground-muted" />
            </Button>
          </div>
        ),
      )}

      {/* Add custom item input */}
      {showAddInput ? (
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 shrink-0" />
          <Input
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            placeholder="Custom option name..."
            className="h-8 flex-1 bg-card-elevated text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") addCustomItem();
              if (e.key === "Escape") { setShowAddInput(false); setNewItemText(""); }
            }}
          />
          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={addCustomItem}>
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={() => { setShowAddInput(false); setNewItemText(""); }}
          >
            <X className="h-3.5 w-3.5 text-foreground-muted" />
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs text-foreground-muted hover:text-foreground-secondary"
          onClick={() => setShowAddInput(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add custom option
        </Button>
      )}
    </div>
  );
}

// ─── Public QuestionField ─────────────────────────────────────────────────────

interface QuestionFieldProps {
  question: AssistantQuestion;
  value: string | string[];
  onChange: (value: string | string[]) => void;
}

export function QuestionField({ question, value, onChange }: QuestionFieldProps) {
  const renderInput = () => {
    switch (question.type) {
      case "single_select":
        return (
          <SingleSelectField
            question={question}
            value={typeof value === "string" ? value : ""}
            onChange={(v) => onChange(v)}
          />
        );

      case "multi_select":
        return (
          <MultiSelectField
            question={question}
            value={Array.isArray(value) ? value : []}
            onChange={(v) => onChange(v)}
          />
        );

      case "free_text":
        return (
          <Textarea
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder ?? "Enter your answer..."}
            className="min-h-[80px] resize-y bg-card-elevated text-sm"
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Label className="text-sm font-medium text-foreground-secondary">
          {question.question}
        </Label>
        {question.inferred ? (
          <Badge
            variant="secondary"
            className="text-xs font-normal"
            style={{
              backgroundColor: "rgba(59, 130, 246, 0.15)",
              color: "var(--info, #3B82F6)",
              border: "none",
            }}
          >
            Inferred from your prompt
          </Badge>
        ) : null}
      </div>
      {question.inferred && question.inferred_reason ? (
        <p className="text-xs text-foreground-muted">{question.inferred_reason}</p>
      ) : null}
      {renderInput()}
    </div>
  );
}
