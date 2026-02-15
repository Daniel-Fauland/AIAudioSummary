"use client";

import { useState, useRef, useCallback } from "react";
import { UploadCloud, File as FileIcon, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  onSkipUpload: () => void;
  onOpenSettings: () => void;
  disabled?: boolean;
  uploading?: boolean;
  hasAssemblyAiKey: boolean;
}

const ACCEPTED_TYPES = new Set([
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/x-m4a",
  "audio/flac",
  "audio/ogg",
  "audio/webm",
  "video/mp4",
  "video/webm",
]);

const ACCEPTED_EXTENSIONS = new Set([
  ".mp3",
  ".wav",
  ".m4a",
  ".flac",
  ".ogg",
  ".webm",
  ".mp4",
]);

function isValidAudioFile(file: File): boolean {
  if (ACCEPTED_TYPES.has(file.type)) return true;
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  return ACCEPTED_EXTENSIONS.has(ext);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload({
  onFileSelected,
  onSkipUpload,
  onOpenSettings,
  disabled,
  uploading,
  hasAssemblyAiKey,
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!isValidAudioFile(file)) {
        toast.error(
          "Please upload a valid audio file (.mp3, .wav, .m4a, .flac, .ogg, .webm)",
        );
        return;
      }
      setSelectedFile(file);
      onFileSelected(file);
    },
    [onFileSelected],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled || uploading) return;
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, uploading, handleFile],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled && !uploading) setDragOver(true);
    },
    [disabled, uploading],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleRemove = useCallback(() => {
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const isDisabled = disabled || uploading;

  if (selectedFile && !uploading) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <FileIcon className="h-8 w-8 text-foreground-secondary" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {selectedFile.name}
            </p>
            <p className="text-xs text-foreground-muted">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            className="text-foreground-muted hover:text-destructive"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (uploading) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-card p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-foreground-secondary">Uploading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {hasAssemblyAiKey ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !isDisabled && inputRef.current?.click()}
          className={`flex min-h-[240px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 transition-colors duration-150 ${
            isDisabled
              ? "border-border bg-card opacity-50 cursor-not-allowed"
              : dragOver
                ? "border-border-accent bg-primary-muted"
                : "border-border bg-card hover:border-border-hover hover:bg-card-elevated"
          }`}
        >
          <UploadCloud
            className={`h-12 w-12 ${
              dragOver ? "text-primary" : "text-foreground-muted"
            }`}
          />
          <p className="text-sm text-foreground-secondary">
            Drag and drop an audio file here, or click to browse
          </p>
          <p className="text-xs text-foreground-muted">
            .mp3, .wav, .m4a, .flac, .ogg, .webm (max 500 MB)
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".mp3,.wav,.m4a,.flac,.ogg,.webm,.mp4,audio/*"
            onChange={handleInputChange}
            className="hidden"
            disabled={isDisabled}
          />
        </div>
      ) : (
        <div className="flex min-h-[240px] items-center justify-center rounded-lg border-2 border-dashed border-border bg-card p-6">
          <p
            className="text-sm text-warning cursor-pointer hover:underline"
            onClick={onOpenSettings}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onOpenSettings();
            }}
            role="button"
            tabIndex={0}
          >
            Please add your AssemblyAI API key in Settings before you can
            upload and transcribe an audio file.
          </p>
        </div>
      )}

      <div className="flex justify-center">
        <button
          type="button"
          onClick={onSkipUpload}
          className="text-sm text-foreground-muted hover:text-foreground-secondary underline underline-offset-4 transition-colors"
        >
          I already have a transcript — skip upload
        </button>
      </div>
    </div>
  );
}
