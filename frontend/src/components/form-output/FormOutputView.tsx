"use client";

import { useState, useMemo } from "react";
import { RefreshCw, ArrowLeft, Loader2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FormFieldDefinition, FormFieldType, ContentPayload } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CopyAsButton, SaveAsButton } from "@/components/ui/ContentActions";
import { buildFormPayload } from "@/lib/content-formats";

interface FormOutputViewProps {
  templateName: string;
  fields: FormFieldDefinition[];
  values: Record<string, unknown>;
  isFilling: boolean;
  onManualEdit: (fieldId: string, value: unknown) => void;
  onRefill: () => void;
  onBack: () => void;
  refillDisabled: boolean;
}

function FormFieldRow({
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
            placeholder="Not found in transcript"
            onChange={(e) => onEdit(e.target.value || null)}
            className="text-sm"
          />
        );

      case "number":
        return (
          <Input
            type="number"
            value={value != null ? String(value) : ""}
            placeholder="Not found in transcript"
            onChange={(e) =>
              onEdit(e.target.value ? parseFloat(e.target.value) : null)
            }
            className="text-sm"
          />
        );

      case "date":
        return (
          <Input
            type="date"
            value={(value as string) ?? ""}
            onChange={(e) => onEdit(e.target.value || null)}
            className="text-sm"
          />
        );

      case "boolean":
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={(value as boolean) ?? false}
              onCheckedChange={(checked) => onEdit(checked)}
            />
            <span className="text-sm text-foreground-secondary">
              {value === true ? "Yes" : value === false ? "No" : "Not set"}
            </span>
          </div>
        );

      case "list_str": {
        const items = (value as string[] | null) ?? [];
        return (
          <div className="space-y-1.5">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="text-xs text-foreground-muted w-4 text-right">
                  {i + 1}.
                </span>
                <Input
                  value={item}
                  onChange={(e) => {
                    const updated = [...items];
                    updated[i] = e.target.value;
                    onEdit(updated);
                  }}
                  className="text-sm flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-foreground-muted hover:text-destructive"
                  onClick={() => {
                    const updated = items.filter((_, idx) => idx !== i);
                    onEdit(updated.length > 0 ? updated : null);
                  }}
                >
                  <span className="text-xs">&times;</span>
                </Button>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => onEdit([...items, ""])}
            >
              + Add item
            </Button>
            {items.length === 0 && (
              <span className="text-xs text-foreground-muted">
                Not found in transcript
              </span>
            )}
          </div>
        );
      }

      case "enum":
        return (
          <Select
            value={(value as string) ?? ""}
            onValueChange={(v) => onEdit(v || null)}
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Not found in transcript" />
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
          <div className="space-y-1.5">
            {field.options?.map((opt) => (
              <label
                key={opt}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Checkbox
                  checked={selected.includes(opt)}
                  onCheckedChange={(checked) => {
                    const updated = checked
                      ? [...selected, opt]
                      : selected.filter((s) => s !== opt);
                    onEdit(updated.length > 0 ? updated : null);
                  }}
                />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
            {(!field.options || field.options.length === 0) && (
              <span className="text-xs text-foreground-muted">
                No options defined
              </span>
            )}
          </div>
        );
      }

      default:
        return (
          <Input
            value={String(value ?? "")}
            placeholder="Not found in transcript"
            onChange={(e) => onEdit(e.target.value || null)}
            className="text-sm"
          />
        );
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-foreground-secondary">
          {field.label}
        </label>
        {field.description && (
          <span className="text-xs text-foreground-muted">
            {field.description}
          </span>
        )}
      </div>
      {renderInput()}
    </div>
  );
}

export function FormOutputView({
  templateName,
  fields,
  values,
  isFilling,
  onManualEdit,
  onRefill,
  onBack,
  refillDisabled,
}: FormOutputViewProps) {
  const contentPayload = useMemo<ContentPayload | null>(() => {
    if (fields.length === 0) return null;
    return buildFormPayload(fields, values, templateName);
  }, [fields, values, templateName]);

  const filledCount = fields.filter((f) => values[f.id] != null).length;
  const unfilledFields = fields.filter((f) => values[f.id] == null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const formFields = (
    <>
      {fields.map((field) => (
        <FormFieldRow
          key={field.id}
          field={field}
          value={values[field.id] ?? null}
          onEdit={(val) => onManualEdit(field.id, val)}
        />
      ))}
    </>
  );

  const actionButtons = (
    <div className="grid grid-cols-2 gap-2">
      <Button variant="outline" size="sm" onClick={onBack}>
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Back
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onRefill}
        disabled={refillDisabled || isFilling}
      >
        <RefreshCw className="mr-1.5 h-4 w-4" />
        Re-fill
      </Button>
      <CopyAsButton payload={contentPayload} variant="outline" size="sm" />
      <SaveAsButton payload={contentPayload} variant="outline" size="sm" />
    </div>
  );

  return (
    <Card className="border-border/50 bg-card/10 backdrop-blur-md flex flex-col shadow-sm transition-all duration-300 h-full min-h-0 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between shrink-0 border-b border-border/20 bg-background/30 backdrop-blur-sm pb-4">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg font-semibold">{templateName}</CardTitle>
          {isFilling && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground-muted" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Badge
                variant="secondary"
                className="text-xs font-normal cursor-pointer"
                onMouseEnter={() => { if (window.matchMedia("(hover: hover)").matches) setPopoverOpen(true); }}
                onMouseLeave={() => { if (window.matchMedia("(hover: hover)").matches) setPopoverOpen(false); }}
              >
                {filledCount}/{fields.length} filled
              </Badge>
            </PopoverTrigger>
            {unfilledFields.length > 0 && (
              <PopoverContent className="w-auto max-w-64 p-3" side="bottom" align="end">
                <p className="text-xs font-medium mb-1.5">Unfilled fields</p>
                <ul className="space-y-0.5">
                  {unfilledFields.map((f) => (
                    <li key={f.id} className="text-xs text-foreground-secondary">&bull; {f.label}</li>
                  ))}
                </ul>
              </PopoverContent>
            )}
          </Popover>
          <Button
            variant="outline"
            size="icon-sm"
            className="hidden md:inline-flex text-foreground-secondary hover:text-foreground transition-all"
            onClick={() => setFullscreen(true)}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <ScrollArea className="flex-1 min-h-0">
        <CardContent className="space-y-4">
          {formFields}
        </CardContent>
      </ScrollArea>
      <div className="shrink-0 border-t border-border/20 bg-background/30 backdrop-blur-sm p-4">
        {actionButtons}
      </div>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="sm:max-w-[95vw] h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{templateName}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-1 min-h-0 flex-col rounded-md bg-card">
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-4 p-4">
                {formFields}
              </div>
            </ScrollArea>
            <div className="p-4 pt-2">
              {actionButtons}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
