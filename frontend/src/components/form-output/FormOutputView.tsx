"use client";

import { useMemo } from "react";
import { RefreshCw, ArrowLeft, Loader2 } from "lucide-react";
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
import type { FormFieldDefinition, FormFieldType, ContentPayload } from "@/lib/types";
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

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold">{templateName}</CardTitle>
          <div className="flex items-center gap-2">
            {isFilling && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground-muted" />
            )}
            <Badge variant="secondary" className="text-xs font-normal">
              {filledCount}/{fields.length} filled
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map((field) => (
          <FormFieldRow
            key={field.id}
            field={field}
            value={values[field.id] ?? null}
            onEdit={(val) => onManualEdit(field.id, val)}
          />
        ))}

        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            Back
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefill}
            disabled={refillDisabled || isFilling}
          >
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            Re-fill
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyAsButton payload={contentPayload} variant="outline" size="sm" />
          <SaveAsButton payload={contentPayload} variant="outline" size="sm" />
        </div>
      </CardContent>
    </Card>
  );
}
