"use client";

import { useState, useCallback, useEffect } from "react";
import { Plus, Trash2, GripVertical, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateTemplate } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { AzureConfig, LangdockConfig, FormFieldDefinition, FormFieldType, FormTemplate, LLMProvider } from "@/lib/types";

const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  string: "Text",
  number: "Number",
  date: "Date",
  boolean: "Yes / No",
  list_str: "List",
  enum: "Single Choice",
  multi_select: "Multiple Choice",
};

interface FormTemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: FormTemplate | null;
  onSave: (template: FormTemplate) => void;
  llmProvider?: LLMProvider;
  llmApiKey?: string;
  llmModel?: string;
  llmAzureConfig?: AzureConfig | null;
  llmLangdockConfig?: LangdockConfig;
}

export function FormTemplateEditor({
  open,
  onOpenChange,
  template,
  onSave,
  llmProvider,
  llmApiKey,
  llmModel,
  llmAzureConfig,
  llmLangdockConfig,
}: FormTemplateEditorProps) {
  const isEditing = !!template;

  const [name, setName] = useState("");
  const [fields, setFields] = useState<FormFieldDefinition[]>([]);
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiDescription, setAiDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const hasLlmConfig = !!(llmProvider && llmApiKey && llmModel);

  // Sync state when dialog opens or template changes while open
  useEffect(() => {
    if (open) {
      setName(template?.name ?? "");
      setFields(template?.fields ?? []);
      setShowAiInput(false);
      setAiDescription("");
    }
  }, [open, template]);

  const addField = useCallback(() => {
    setFields((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: "",
        type: "string" as FormFieldType,
      },
    ]);
  }, []);

  const removeField = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const updateField = useCallback(
    (id: string, patch: Partial<FormFieldDefinition>) => {
      setFields((prev) =>
        prev.map((f) => {
          if (f.id !== id) return f;
          const updated = { ...f, ...patch };
          // Clear options when switching away from enum/multi_select
          if (patch.type && patch.type !== "enum" && patch.type !== "multi_select") {
            delete updated.options;
          }
          // Initialize options with 2 empty slots when switching to enum/multi_select
          if (patch.type && (patch.type === "enum" || patch.type === "multi_select") && (!updated.options || updated.options.length < 2)) {
            updated.options = ["", ""];
          }
          return updated;
        }),
      );
    },
    [],
  );

  const moveField = useCallback((index: number, direction: "up" | "down") => {
    setFields((prev) => {
      const newFields = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newFields.length) return prev;
      [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
      return newFields;
    });
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!aiDescription.trim() || !hasLlmConfig) return;

    setIsGenerating(true);
    try {
      const response = await generateTemplate({
        provider: llmProvider!,
        api_key: llmApiKey!,
        model: llmModel!,
        azure_config: llmProvider === "azure_openai" ? llmAzureConfig ?? undefined : undefined,
        langdock_config: llmProvider === "langdock" ? llmLangdockConfig : undefined,
        description: aiDescription.trim(),
      });

      // Set name only if currently empty
      if (!name.trim()) {
        setName(response.name);
      }

      // Replace fields with AI-generated ones (assign new UUIDs)
      const newFields: FormFieldDefinition[] = response.fields.map((f) => ({
        id: crypto.randomUUID(),
        label: f.label,
        type: f.type,
        description: f.description || undefined,
        options: f.options || undefined,
      }));
      setFields(newFields);
      setShowAiInput(false);
      setAiDescription("");
    } catch (e) {
      toast.error(getErrorMessage(e, "formOutput"));
    } finally {
      setIsGenerating(false);
    }
  }, [aiDescription, hasLlmConfig, llmProvider, llmApiKey, llmModel, llmAzureConfig, llmLangdockConfig, name]);

  const handleSave = useCallback(() => {
    if (!name.trim()) return;
    if (fields.length === 0) return;
    if (fields.some((f) => !f.label.trim())) return;

    const saved: FormTemplate = {
      id: template?.id ?? `form:${Date.now()}`,
      name: name.trim(),
      fields: fields.map((f) => ({
        ...f,
        label: f.label.trim(),
        description: f.description?.trim() || undefined,
        options: f.options?.map((o) => o.trim()).filter(Boolean) ?? undefined,
      })),
    };

    onSave(saved);
    onOpenChange(false);
  }, [name, fields, template, onSave, onOpenChange]);

  const canSave =
    name.trim().length > 0 &&
    fields.length > 0 &&
    fields.every((f) => f.label.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg md:max-w-2xl bg-card max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Template" : "Create Template"}</DialogTitle>
          <DialogDescription>
            Define the form fields to extract from the transcript.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
          {/* AI generate toggle */}
          {hasLlmConfig && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowAiInput((prev) => !prev)}
              disabled={isGenerating}
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI Generate
            </Button>
          )}

          {/* AI generation input */}
          {showAiInput && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
              <Label className="text-xs text-foreground-secondary">
                Describe the form template you need
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., Meeting notes with date, attendees, action items, and decisions"
                  value={aiDescription}
                  onChange={(e) => setAiDescription(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleGenerate();
                    }
                  }}
                  disabled={isGenerating}
                  className="flex-1 text-sm"
                />
                <Button
                  size="sm"
                  onClick={handleGenerate}
                  disabled={!aiDescription.trim() || isGenerating}
                >
                  {isGenerating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Generate"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Template name */}
          <div className="space-y-1.5">
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              placeholder="e.g., Patient Intake Form"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Fields */}
          <div className="space-y-3">
            <Label>Fields</Label>
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="rounded-lg border border-border bg-card-elevated p-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      className="text-foreground-muted hover:text-foreground disabled:opacity-30"
                      disabled={index === 0}
                      onClick={() => moveField(index, "up")}
                    >
                      <GripVertical className="h-3 w-3 rotate-90" />
                    </button>
                    <button
                      type="button"
                      className="text-foreground-muted hover:text-foreground disabled:opacity-30"
                      disabled={index === fields.length - 1}
                      onClick={() => moveField(index, "down")}
                    >
                      <GripVertical className="h-3 w-3 -rotate-90" />
                    </button>
                  </div>
                  <Input
                    placeholder="Field label"
                    value={field.label}
                    onChange={(e) =>
                      updateField(field.id, { label: e.target.value })
                    }
                    className="flex-1"
                  />
                  <Select
                    value={field.type}
                    onValueChange={(v) =>
                      updateField(field.id, { type: v as FormFieldType })
                    }
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-foreground-muted hover:text-destructive"
                    onClick={() => removeField(field.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {/* Description */}
                <Input
                  placeholder="Description (optional LLM hint)"
                  value={field.description ?? ""}
                  onChange={(e) =>
                    updateField(field.id, {
                      description: e.target.value || undefined,
                    })
                  }
                  className="text-xs"
                />
                {/* Options for enum / multi_select */}
                {(field.type === "enum" || field.type === "multi_select") && (
                  <div className="space-y-1.5">
                    <span className="text-xs text-foreground-muted">
                      Options
                    </span>
                    {(field.options ?? []).map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-1.5">
                        <Input
                          placeholder={`Option ${optIdx + 1}`}
                          value={opt}
                          onChange={(e) => {
                            const newOptions = [...(field.options ?? [])];
                            newOptions[optIdx] = e.target.value;
                            updateField(field.id, { options: newOptions });
                          }}
                          className="flex-1 text-xs"
                        />
                        {optIdx >= 2 ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 text-foreground-muted hover:text-destructive"
                            onClick={() => {
                              const newOptions = (field.options ?? []).filter(
                                (_, i) => i !== optIdx,
                              );
                              updateField(field.id, { options: newOptions });
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <div className="w-7 shrink-0" />
                        )}
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-foreground-muted hover:text-foreground"
                      onClick={() => {
                        const newOptions = [...(field.options ?? []), ""];
                        updateField(field.id, { options: newOptions });
                      }}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Add Option
                    </Button>
                  </div>
                )}
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={addField}
              className="w-full"
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Field
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {isEditing ? "Save Changes" : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
