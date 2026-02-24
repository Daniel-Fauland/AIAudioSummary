"use client";

import { useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormTemplateEditor } from "./FormTemplateEditor";
import type { FormTemplate } from "@/lib/types";

const FIELD_TYPE_LABELS: Record<string, string> = {
  string: "Text",
  number: "Number",
  date: "Date",
  boolean: "Yes/No",
  list_str: "List",
  enum: "Choice",
  multi_select: "Multi",
};

interface FormTemplateSelectorProps {
  templates: FormTemplate[];
  selectedTemplateId: string | null;
  onSelectTemplate: (id: string | null) => void;
  onSaveTemplate: (template: FormTemplate) => void;
  onUpdateTemplate: (template: FormTemplate) => void;
  onDeleteTemplate: (id: string) => void;
  onFillForm: () => void;
  fillDisabled: boolean;
  isFilling: boolean;
}

export function FormTemplateSelector({
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onSaveTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onFillForm,
  fillDisabled,
  isFilling,
}: FormTemplateSelectorProps) {
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

  return (
    <>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Form Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Template selector row */}
          <div className="flex items-center gap-2">
            <Select
              value={selectedTemplateId ?? ""}
              onValueChange={(v) => onSelectTemplate(v || null)}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a form template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={handleCreate}
              title="Create new template"
            >
              <Plus className="h-4 w-4" />
            </Button>
            {selectedTemplate && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={handleEdit}
                  title="Edit template"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-foreground-muted hover:text-destructive"
                  onClick={handleDelete}
                  title="Delete template"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {/* Field preview */}
          {selectedTemplate && (
            <div className="rounded-lg border border-border bg-card-elevated p-3 space-y-1.5">
              <span className="text-xs font-medium text-foreground-secondary">
                Fields ({selectedTemplate.fields.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedTemplate.fields.map((field) => (
                  <Badge
                    key={field.id}
                    variant="secondary"
                    className="text-xs font-normal"
                  >
                    {field.label}
                    <span className="ml-1 text-foreground-muted">
                      {FIELD_TYPE_LABELS[field.type] ?? field.type}
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* No templates hint */}
          {templates.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <FileText className="h-8 w-8 text-foreground-muted" />
              <p className="text-sm text-foreground-muted">
                No form templates yet. Create one to get started.
              </p>
            </div>
          )}

          {/* Fill Form button */}
          <Button
            onClick={onFillForm}
            disabled={fillDisabled || !selectedTemplate}
            className="w-full"
          >
            {isFilling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Filling Form...
              </>
            ) : (
              "Fill Form"
            )}
          </Button>
        </CardContent>
      </Card>

      <FormTemplateEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        template={editingTemplate}
        onSave={handleEditorSave}
      />
    </>
  );
}
