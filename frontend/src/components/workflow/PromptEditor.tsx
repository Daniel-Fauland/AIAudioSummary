"use client";

import { useState, useCallback } from "react";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/ui/date-picker";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PromptAssistantModal } from "@/components/prompt-assistant/PromptAssistantModal";
import type { AzureConfig, LangdockConfig, LLMProvider, PromptTemplate, LanguageOption } from "@/lib/types";

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
  // LLM credentials for Prompt Assistant
  llmProvider?: LLMProvider;
  llmApiKey?: string;
  llmModel?: string;
  llmAzureConfig?: AzureConfig | null;
  llmLangdockConfig?: LangdockConfig;
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
  llmProvider,
  llmApiKey,
  llmModel,
  llmAzureConfig,
  llmLangdockConfig,
}: PromptEditorProps) {
  const [assistantOpen, setAssistantOpen] = useState(false);

  const canUseAssistant = !!(llmProvider && llmApiKey && llmModel);
  const allTemplates = [...templates, ...customTemplates];

  // "Other" language support
  const [isOtherMode, setIsOtherMode] = useState(
    () => !!selectedLanguage && !new Set(languages.map((l) => l.name)).has(selectedLanguage),
  );
  const [customLanguageInput, setCustomLanguageInput] = useState(
    () => {
      const knownNames = new Set(languages.map((l) => l.name));
      return !knownNames.has(selectedLanguage) ? selectedLanguage : "";
    },
  );

  const dropdownValue = isOtherMode ? "__other__" : selectedLanguage;

  const handleLanguageSelect = useCallback(
    (value: string) => {
      if (value === "__other__") {
        setIsOtherMode(true);
        if (customLanguageInput) {
          onLanguageChange(customLanguageInput);
        }
      } else {
        setIsOtherMode(false);
        onLanguageChange(value);
      }
    },
    [customLanguageInput, onLanguageChange],
  );

  const handleCustomLanguageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCustomLanguageInput(e.target.value);
      onLanguageChange(e.target.value);
    },
    [onLanguageChange],
  );

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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 text-foreground-muted" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete custom template</TooltipContent>
              </Tooltip>
            ) : null}
          </div>

          {/* Prompt textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-foreground-secondary">
                Prompt
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAssistantOpen(true)}
                    disabled={!canUseAssistant}
                    className="gap-1.5 text-xs"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Prompt Assistant
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {canUseAssistant
                    ? "Use AI to help create or refine your prompt"
                    : "Add an LLM API key in Settings to use Prompt Assistant"}
                </TooltipContent>
              </Tooltip>
            </div>
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
              <Select value={dropdownValue} onValueChange={handleLanguageSelect}>
                <SelectTrigger className="bg-card-elevated">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((l) => (
                    <SelectItem key={l.code} value={l.name}>
                      {l.name}
                    </SelectItem>
                  ))}
                  <SelectSeparator />
                  <SelectItem value="__other__">Other</SelectItem>
                </SelectContent>
              </Select>
              {isOtherMode ? (
                <Input
                  value={customLanguageInput}
                  onChange={handleCustomLanguageChange}
                  placeholder="Enter language…"
                  className="bg-card-elevated mt-2"
                  autoFocus
                />
              ) : null}
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
              className="h-11 w-full sm:w-auto"
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

      {/* Prompt Assistant modal */}
      {llmProvider && llmApiKey && llmModel ? (
        <PromptAssistantModal
          open={assistantOpen}
          onOpenChange={setAssistantOpen}
          onPromptGenerated={(prompt) => {
            onPromptChange(prompt);
            setHasEdited(true);
          }}
          provider={llmProvider}
          apiKey={llmApiKey}
          model={llmModel}
          azureConfig={llmAzureConfig ?? null}
          langdockConfig={llmLangdockConfig}
          currentPrompt={selectedPrompt}
        />
      ) : null}

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
