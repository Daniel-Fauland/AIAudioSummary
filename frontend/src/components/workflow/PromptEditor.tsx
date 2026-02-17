"use client";

import { useState, useCallback, useMemo } from "react";
import { format, parse } from "date-fns";
import { CalendarIcon, Loader2, Plus, Trash2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

function DatePicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (date: string | null) => void;
}) {
  const [open, setOpen] = useState(false);

  const dateValue = useMemo(() => {
    if (!value) return undefined;
    return parse(value, "yyyy-MM-dd", new Date());
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative">
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`w-full justify-start text-left font-normal bg-card-elevated ${
              !value ? "text-foreground-muted" : ""
            }`}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateValue ? format(dateValue, "dd.MM.yyyy") : "Pick a date"}
          </Button>
        </PopoverTrigger>
        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-foreground-muted hover:text-foreground-secondary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={(day) => {
            if (day) {
              onChange(format(day, "yyyy-MM-dd"));
            } else {
              onChange(null);
            }
            setOpen(false);
          }}
          defaultMonth={dateValue}
          weekStartsOn={1}
          footer={
            <div className="flex justify-between px-3 pb-3 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                Clear
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onChange(format(new Date(), "yyyy-MM-dd"));
                  setOpen(false);
                }}
              >
                Today
              </Button>
            </div>
          }
        />
      </PopoverContent>
    </Popover>
  );
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
            <DatePicker value={meetingDate} onChange={onMeetingDateChange} />
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
