"use client";

import { useCallback } from "react";
import { Copy, Download, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { ContentPayload, CopyFormat, SaveFormat } from "@/lib/types";
import {
  getAvailableCopyFormats,
  getAvailableSaveFormats,
  copyAs,
  saveAs,
  COPY_FORMAT_LABELS,
  SAVE_FORMAT_LABELS,
} from "@/lib/content-formats";

// === localStorage helpers ===

const COPY_FORMAT_KEY = "aias:v1:default_copy_format";
const SAVE_FORMAT_KEY = "aias:v1:default_save_format";

function readDefault<T extends string>(key: string, fallback: T): T {
  try {
    if (typeof window === "undefined") return fallback;
    return (localStorage.getItem(key) as T) || fallback;
  } catch {
    return fallback;
  }
}

// === CopyAsButton ===

interface CopyAsButtonProps {
  payload: ContentPayload | null;
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function CopyAsButton({ payload, variant = "secondary", size = "default" }: CopyAsButtonProps) {
  const availableFormats = payload ? getAvailableCopyFormats(payload.type) : [];
  const defaultFormat = getValidDefault(readDefault(COPY_FORMAT_KEY, "formatted"), availableFormats);
  const disabled = !payload || !payload.plainText;

  const handleCopy = useCallback(
    async (format: CopyFormat) => {
      if (!payload) return;
      try {
        await copyAs(payload, format);
        toast.success(`Copied as ${COPY_FORMAT_LABELS[format]}`, { position: "bottom-center" });
      } catch {
        toast.error("Failed to copy to clipboard");
      }
    },
    [payload],
  );

  return (
    <div className="flex">
      <Button
        variant={variant}
        size={size}
        className="rounded-r-none justify-start"
        disabled={disabled}
        onClick={() => handleCopy(defaultFormat)}
      >
        <Copy className="mr-1.5 h-3.5 w-3.5" />
        Copy as
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className="rounded-l-none border-l border-border/50 px-1.5"
            disabled={disabled}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup value={defaultFormat}>
            {availableFormats.map((fmt) => (
              <DropdownMenuRadioItem
                key={fmt}
                value={fmt}
                className="text-xs"
                onSelect={() => handleCopy(fmt)}
              >
                {COPY_FORMAT_LABELS[fmt]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// === SaveAsButton ===

interface SaveAsButtonProps {
  payload: ContentPayload | null;
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function SaveAsButton({ payload, variant = "secondary", size = "default" }: SaveAsButtonProps) {
  const availableFormats = payload ? getAvailableSaveFormats(payload.type) : [];
  const defaultFormat = getValidDefault(readDefault(SAVE_FORMAT_KEY, "docx"), availableFormats);
  const disabled = !payload || !payload.plainText;

  const handleSave = useCallback(
    async (format: SaveFormat) => {
      if (!payload) return;
      try {
        await saveAs(payload, format);
        toast.success(`Saved as ${SAVE_FORMAT_LABELS[format]}`, { position: "bottom-center" });
      } catch (err) {
        console.error("Save failed:", err);
        toast.error("Failed to save file");
      }
    },
    [payload],
  );

  return (
    <div className="flex">
      <Button
        variant={variant}
        size={size}
        className="rounded-r-none justify-start"
        disabled={disabled}
        onClick={() => handleSave(defaultFormat)}
      >
        <Download className="mr-1.5 h-3.5 w-3.5" />
        Save as
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className="rounded-l-none border-l border-border/50 px-1.5"
            disabled={disabled}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup value={defaultFormat}>
            {availableFormats.map((fmt) => (
              <DropdownMenuRadioItem
                key={fmt}
                value={fmt}
                className="text-xs"
                onSelect={() => handleSave(fmt)}
              >
                {SAVE_FORMAT_LABELS[fmt]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// === Helpers ===

function getValidDefault<T extends string>(stored: T, available: T[]): T {
  if (available.length === 0) return stored;
  return available.includes(stored) ? stored : available[0];
}
