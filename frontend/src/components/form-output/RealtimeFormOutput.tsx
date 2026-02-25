"use client";

import { useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Loader2, Lock, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormTemplateEditor } from "./FormTemplateEditor";
import type { AzureConfig, LangdockConfig, FormFieldDefinition, FormFieldType, FormTemplate, LLMProvider } from "@/lib/types";

function CompactFieldRow({
  field,
  value,
  onEdit,
}: {
  field: FormFieldDefinition;
  value: unknown;
  onEdit: (value: unknown) => void;
}) {
  const renderInput = () => {
    switch (field.type as FormFieldType) {
      case "string":
        return (
          <Input
            value={(value as string) ?? ""}
            placeholder="—"
            onChange={(e) => onEdit(e.target.value || null)}
            className="text-xs h-7"
          />
        );

      case "number":
        return (
          <Input
            type="number"
            value={value != null ? String(value) : ""}
            placeholder="—"
            onChange={(e) =>
              onEdit(e.target.value ? parseFloat(e.target.value) : null)
            }
            className="text-xs h-7"
          />
        );

      case "date":
        return (
          <Input
            type="date"
            value={(value as string) ?? ""}
            onChange={(e) => onEdit(e.target.value || null)}
            className="text-xs h-7"
          />
        );

      case "boolean":
        return (
          <div className="flex items-center gap-1.5">
            <Switch
              checked={(value as boolean) ?? false}
              onCheckedChange={(checked) => onEdit(checked)}
            />
            <span className="text-xs text-foreground-secondary">
              {value === true ? "Yes" : value === false ? "No" : "—"}
            </span>
          </div>
        );

      case "list_str": {
        const items = (value as string[] | null) ?? [];
        return (
          <div className="text-xs text-foreground-secondary">
            {items.length > 0 ? items.join(", ") : "—"}
          </div>
        );
      }

      case "enum":
        return (
          <Select
            value={(value as string) ?? ""}
            onValueChange={(v) => onEdit(v || null)}
          >
            <SelectTrigger className="text-xs h-7">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "multi_select": {
        const selected = (value as string[] | null) ?? [];
        return (
          <div className="flex flex-wrap gap-1">
            {field.options?.map((opt) => (
              <label
                key={opt}
                className="flex items-center gap-1 cursor-pointer"
              >
                <Checkbox
                  checked={selected.includes(opt)}
                  onCheckedChange={(checked) => {
                    const updated = checked
                      ? [...selected, opt]
                      : selected.filter((s) => s !== opt);
                    onEdit(updated.length > 0 ? updated : null);
                  }}
                  className="h-3.5 w-3.5"
                />
                <span className="text-xs">{opt}</span>
              </label>
            ))}
          </div>
        );
      }

      default:
        return (
          <span className="text-xs text-foreground-muted">
            {value != null ? String(value) : "—"}
          </span>
        );
    }
  };

  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-border last:border-b-0">
      <span className="text-xs font-medium text-foreground-secondary min-w-[100px] pt-1 shrink-0">
        {field.label}
      </span>
      <div className="flex-1 min-w-0">{renderInput()}</div>
    </div>
  );
}

interface RealtimeFormOutputProps {
  templates: FormTemplate[];
  selectedTemplateId: string | null;
  onSelectTemplate: (id: string | null) => void;
  onSaveTemplate: (template: FormTemplate) => void;
  onUpdateTemplate: (template: FormTemplate) => void;
  onDeleteTemplate: (id: string) => void;
  values: Record<string, unknown>;
  isFilling: boolean;
  isComplete: boolean;
  onManualEdit: (fieldId: string, value: unknown) => void;
  onToggleComplete: () => void;
  llmProvider?: LLMProvider;
  llmApiKey?: string;
  llmModel?: string;
  llmAzureConfig?: AzureConfig | null;
  llmLangdockConfig?: LangdockConfig;
}

export function RealtimeFormOutput({
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onSaveTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  values,
  isFilling,
  isComplete,
  onManualEdit,
  onToggleComplete,
  llmProvider,
  llmApiKey,
  llmModel,
  llmAzureConfig,
  llmLangdockConfig,
}: RealtimeFormOutputProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FormTemplate | null>(
    null,
  );

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const handleCreate = useCallback(() => {
    setEditingTemplate(null);
    setEditorOpen(true);
  }, []);

  const handleEdit = useCallback(() => {
    if (selectedTemplate) {
      setEditingTemplate(selectedTemplate);
      setEditorOpen(true);
    }
  }, [selectedTemplate]);

  const handleDelete = useCallback(() => {
    if (selectedTemplateId) {
      onDeleteTemplate(selectedTemplateId);
      onSelectTemplate(null);
    }
  }, [selectedTemplateId, onDeleteTemplate, onSelectTemplate]);

  const handleEditorSave = useCallback(
    (template: FormTemplate) => {
      if (editingTemplate) {
        onUpdateTemplate(template);
      } else {
        onSaveTemplate(template);
        onSelectTemplate(template.id);
      }
    },
    [editingTemplate, onSaveTemplate, onUpdateTemplate, onSelectTemplate],
  );

  const filledCount = selectedTemplate
    ? selectedTemplate.fields.filter((f) => values[f.id] != null).length
    : 0;

  return (
    <>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold">Form Output</CardTitle>
            <div className="flex items-center gap-2">
              {isFilling && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground-muted" />
              )}
              {selectedTemplate && (
                <Badge variant="secondary" className="text-xs font-normal">
                  {filledCount}/{selectedTemplate.fields.length} filled
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Template selector */}
          <div className="flex items-center gap-1.5">
            <Select
              value={selectedTemplateId ?? "__none__"}
              onValueChange={(v) => onSelectTemplate(v === "__none__" ? null : v)}
            >
              <SelectTrigger className="flex-1 h-8 text-xs">
                <SelectValue placeholder="Select template..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  <span className="text-foreground-muted">No template</span>
                </SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={handleCreate}
              title="Create template"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            {selectedTemplate && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={handleEdit}
                  title="Edit template"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-foreground-muted hover:text-destructive"
                  onClick={handleDelete}
                  title="Delete template"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>

          {/* Form values */}
          {selectedTemplate && (
            <div className="space-y-0">
              {selectedTemplate.fields.map((field) => (
                <CompactFieldRow
                  key={field.id}
                  field={field}
                  value={values[field.id] ?? null}
                  onEdit={(val) => onManualEdit(field.id, val)}
                />
              ))}
            </div>
          )}

          {/* Mark as Complete toggle */}
          {selectedTemplate && (
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5 text-xs text-foreground-secondary">
                {isComplete ? (
                  <Lock className="h-3 w-3" />
                ) : (
                  <Unlock className="h-3 w-3" />
                )}
                Mark as Complete
              </div>
              <Switch checked={isComplete} onCheckedChange={onToggleComplete} />
            </div>
          )}

          {/* No templates hint */}
          {templates.length === 0 && (
            <p className="text-xs text-foreground-muted text-center py-2">
              No form templates. Create one to start extracting structured data.
            </p>
          )}
        </CardContent>
      </Card>

      <FormTemplateEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        template={editingTemplate}
        onSave={handleEditorSave}
        llmProvider={llmProvider}
        llmApiKey={llmApiKey}
        llmModel={llmModel}
        llmAzureConfig={llmAzureConfig}
        llmLangdockConfig={llmLangdockConfig}
      />
    </>
  );
}
