"use client";

import { useState, useCallback } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PromptTemplate, LanguageOption } from "@/lib/types";

interface PromptEditorProps {
  templates: PromptTemplate[];
  customTemplates: PromptTemplate[];
  onSaveCustomTemplate: (name: string, content: string) => PromptTemplate;
  onDeleteCustomTemplate: (id: string) => void;
  languages: LanguageOption[];
  selectedPrompt: string;
  onPromptChange: (prompt: string) => void;
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  informalGerman: boolean;
  onInformalGermanChange: (value: boolean) => void;
  meetingDate: string | null;
  onMeetingDateChange: (date: string | null) => void;
  onGenerate: () => void;
  generateDisabled?: boolean;
  generating?: boolean;
  hasLlmKey?: boolean;
  onOpenSettings?: () => void;
}

export function PromptEditor({
  templates,
  customTemplates,
  onSaveCustomTemplate,
  onDeleteCustomTemplate,
  languages,
  selectedPrompt,
  onPromptChange,
  selectedLanguage,
  onLanguageChange,
  informalGerman,
  onInformalGermanChange,
  meetingDate,
  onMeetingDateChange,
  onGenerate,
  generateDisabled,
  generating,
  hasLlmKey,
  onOpenSettings,
}: PromptEditorProps) {
  const allTemplates = [...templates, ...customTemplates];

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates[0]?.id ?? "",
  );
  const [hasEdited, setHasEdited] = useState(false);

  // Save dialog state
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveDialogName, setSaveDialogName] = useState("");

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const isCustomSelected = selectedTemplateId.startsWith("custom:");

  const handleTemplateChange = useCallback(
    (templateId: string) => {
      const template = allTemplates.find((t) => t.id === templateId);
      if (!template) return;

      if (hasEdited) {
        const confirmed = window.confirm(
          "You have unsaved edits. Switching templates will replace the current prompt. Continue?",
        );
        if (!confirmed) return;
      }

      setSelectedTemplateId(templateId);
      onPromptChange(template.content);
      setHasEdited(false);
    },
    [allTemplates, hasEdited, onPromptChange],
  );

  const handlePromptEdit = useCallback(
    (value: string) => {
      onPromptChange(value);
      setHasEdited(true);
    },
    [onPromptChange],
  );

  const handleReset = useCallback(() => {
    const template = allTemplates.find((t) => t.id === selectedTemplateId);
    if (template) {
      onPromptChange(template.content);
      setHasEdited(false);
    }
  }, [allTemplates, selectedTemplateId, onPromptChange]);

  const handleSaveConfirm = useCallback(() => {
    const name = saveDialogName.trim();
    if (!name) return;

    const saved = onSaveCustomTemplate(name, selectedPrompt);
    setSelectedTemplateId(saved.id);
    setHasEdited(false);
    setSaveDialogOpen(false);
    setSaveDialogName("");
  }, [saveDialogName, selectedPrompt, onSaveCustomTemplate]);

  const handleDeleteConfirm = useCallback(() => {
    onDeleteCustomTemplate(selectedTemplateId);
    const fallback = templates[0];
    if (fallback) {
      setSelectedTemplateId(fallback.id);
      onPromptChange(fallback.content);
    }
    setHasEdited(false);
    setDeleteDialogOpen(false);
  }, [selectedTemplateId, templates, onDeleteCustomTemplate, onPromptChange]);

  const deletingTemplateName =
    customTemplates.find((t) => t.id === selectedTemplateId)?.name ?? "";

  const isGerman = selectedLanguage === "German";

  return (
    <>
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Prompt Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Template selector */}
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5 md:max-w-[300px]">
              <Label className="text-sm font-medium text-foreground-secondary">
                Template
              </Label>
              <Select
                value={selectedTemplateId}
                onValueChange={handleTemplateChange}
              >
                <SelectTrigger className="bg-card-elevated">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Built-in</SelectLabel>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  {customTemplates.length > 0 ? (
                    <>
                      <SelectSeparator />
                      <SelectGroup>
                        <SelectLabel>Custom</SelectLabel>
                        {customTemplates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </>
                  ) : null}
                </SelectContent>
              </Select>
            </div>
            {hasEdited ? (
              <Button variant="ghost" size="sm" onClick={handleReset}>
                Reset
              </Button>
            ) : null}
            {isCustomSelected ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteDialogOpen(true)}
                title="Delete custom template"
              >
                <Trash2 className="h-4 w-4 text-foreground-muted" />
              </Button>
            ) : null}
          </div>

          {/* Prompt textarea */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground-secondary">
              Prompt
            </Label>
            <Textarea
              value={selectedPrompt}
              onChange={(e) => handlePromptEdit(e.target.value)}
              className="min-h-[200px] resize-y bg-card-elevated text-sm"
              placeholder="Enter your prompt..."
            />
          </div>

          {/* Save as template */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSaveDialogName("");
              setSaveDialogOpen(true);
            }}
            disabled={!selectedPrompt.trim()}
          >
            <Plus className="mr-2 h-4 w-4" />
            Save as Custom Template
          </Button>

          {/* Language + Informal German */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="space-y-1.5 sm:w-[200px]">
              <Label className="text-sm font-medium text-foreground-secondary">
                Language
              </Label>
              <Select value={selectedLanguage} onValueChange={onLanguageChange}>
                <SelectTrigger className="bg-card-elevated">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((l) => (
                    <SelectItem key={l.code} value={l.name}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isGerman ? (
              <div className="flex items-center gap-2">
                <Switch
                  id="informal-german"
                  checked={informalGerman}
                  onCheckedChange={onInformalGermanChange}
                />
                <Label
                  htmlFor="informal-german"
                  className="text-sm text-foreground-secondary"
                >
                  Informal German (du/ihr)
                </Label>
              </div>
            ) : null}
          </div>

          {/* Date picker */}
          <div className="space-y-1.5 sm:w-[200px]">
            <Label className="text-sm font-medium text-foreground-secondary">
              Meeting Date (optional)
            </Label>
            <Input
              type="date"
              value={meetingDate ?? ""}
              onChange={(e) =>
                onMeetingDateChange(e.target.value || null)
              }
              className="bg-card-elevated"
            />
          </div>

          {/* Generate button */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              onClick={onGenerate}
              disabled={generateDisabled || generating || !selectedPrompt.trim()}
              className="h-11 w-full sm:w-auto hover:bg-primary/75"
            >
              {generating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {generating ? "Generating..." : "Generate Summary"}
            </Button>
            {!hasLlmKey && !generating ? (
              <p
                className="text-sm text-warning cursor-pointer hover:underline"
                onClick={onOpenSettings}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onOpenSettings?.();
                }}
                role="button"
                tabIndex={0}
              >
                Please add an API key in Settings to generate a summary.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Save template dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Custom Template</DialogTitle>
            <DialogDescription>
              Enter a name for your custom template.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={saveDialogName}
            onChange={(e) => setSaveDialogName(e.target.value)}
            placeholder="e.g., My Meeting Template"
            className="bg-card-elevated"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && saveDialogName.trim()) {
                handleSaveConfirm();
              }
            }}
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setSaveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveConfirm}
              disabled={!saveDialogName.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete template dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Custom Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deletingTemplateName}
              &rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
