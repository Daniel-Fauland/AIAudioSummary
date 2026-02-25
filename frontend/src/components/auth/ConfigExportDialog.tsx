"use client";

import { useState, useCallback, useRef } from "react";
import { Copy, Check, Upload, AlertTriangle, Info, QrCode, ClipboardPaste } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  exportSettings,
  exportApiKeys,
  importSettings,
  parseConfigString,
  configContainsApiKeys,
  buildImportUrl,
  QR_URL_MAX_LENGTH,
} from "@/lib/config-export";

interface ConfigExportDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ConfigExportDialog({ open, onClose }: ConfigExportDialogProps) {
  const [includeApiKeys, setIncludeApiKeys] = useState(false);
  const [includeSessionData, setIncludeSessionData] = useState(true);
  const [exportString, setExportString] = useState("");
  const [copied, setCopied] = useState(false);
  const [importValue, setImportValue] = useState("");
  const [importPreview, setImportPreview] = useState<{
    keyCount: number;
    hasApiKeys: boolean;
  } | null>(null);
  const [importError, setImportError] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrError, setQrError] = useState("");
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleExport = useCallback(() => {
    try {
      const result = exportSettings({ includeApiKeys, includeSessionData });
      setExportString(result);
      setCopied(false);
      setQrDataUrl("");
      setQrError("");
    } catch {
      toast.error("Failed to export settings");
    }
  }, [includeApiKeys, includeSessionData]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(exportString);
      setCopied(true);
      clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }, [exportString]);

  const handleShowQr = useCallback(async () => {
    try {
      const apiKeysConfig = exportApiKeys();
      const url = buildImportUrl(apiKeysConfig);
      if (url.length > QR_URL_MAX_LENGTH) {
        setQrError("API key config is too large for a QR code.");
        setQrDataUrl("");
        return;
      }
      const dataUrl = await QRCode.toDataURL(url, {
        margin: 2,
        width: 350,
        errorCorrectionLevel: "L",
      });
      setQrDataUrl(dataUrl);
      setQrError("");
    } catch (err) {
      setQrError(err instanceof Error ? err.message : "Failed to generate QR code");
      setQrDataUrl("");
    }
  }, []);

  const validateImportValue = useCallback((value: string) => {
    setImportValue(value);
    setImportError("");
    setImportPreview(null);

    if (!value.trim()) return;

    try {
      const settings = parseConfigString(value);
      setImportPreview({
        keyCount: Object.keys(settings).length,
        hasApiKeys: configContainsApiKeys(settings),
      });
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Invalid config string"
      );
    }
  }, []);

  const handleImportValueChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      validateImportValue(e.target.value);
    },
    [validateImportValue]
  );

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) validateImportValue(text);
    } catch {
      toast.error("Clipboard access denied. Please paste manually (Ctrl+V / Cmd+V).");
    }
  }, [validateImportValue]);

  const handleImport = useCallback(() => {
    try {
      const count = importSettings(importValue);
      toast.success(`Imported ${count} setting${count !== 1 ? "s" : ""}. Reload the page to apply.`);
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to import settings"
      );
    }
  }, [importValue, onClose]);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        onClose();
        // Reset state on close
        setExportString("");
        setCopied(false);
        setImportValue("");
        setImportPreview(null);
        setImportError("");
        setIncludeApiKeys(false);
        setIncludeSessionData(true);
        setQrDataUrl("");
        setQrError("");
      }
    },
    [onClose]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Export / Import Settings</DialogTitle>
          <DialogDescription className="text-sm text-foreground-secondary">
            Transfer your settings between browsers or devices using a portable
            config string.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="export" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="export" className="flex-1">
              Export
            </TabsTrigger>
            <TabsTrigger value="import" className="flex-1">
              Import
            </TabsTrigger>
          </TabsList>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-4 pt-4">
            <div className="flex items-start gap-2">
              <Checkbox
                id="include-api-keys"
                checked={includeApiKeys}
                onCheckedChange={(checked) => {
                  setIncludeApiKeys(checked === true);
                  setExportString("");
                  setCopied(false);
                  setQrDataUrl("");
                  setQrError("");
                }}
              />
              <div className="grid gap-1">
                <Label
                  htmlFor="include-api-keys"
                  className="text-sm font-medium cursor-pointer"
                >
                  Include API keys
                </Label>
                <p className="text-xs text-foreground-muted">
                  API keys are excluded by default for security
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="include-session-data"
                checked={includeSessionData}
                onCheckedChange={(checked) => {
                  setIncludeSessionData(checked === true);
                  setExportString("");
                  setCopied(false);
                  setQrDataUrl("");
                  setQrError("");
                }}
              />
              <div className="grid gap-1">
                <Label
                  htmlFor="include-session-data"
                  className="text-sm font-medium cursor-pointer"
                >
                  Include session data
                </Label>
                <p className="text-xs text-foreground-muted">
                  Transcripts, summaries, and chat history — disable for smaller QR codes
                </p>
              </div>
            </div>

            {includeApiKeys ? (
              <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning-muted p-3">
                <AlertTriangle className="h-4 w-4 shrink-0 text-warning mt-0.5" />
                <p className="text-xs text-foreground-secondary leading-relaxed">
                  <strong className="text-foreground">Be cautious when sharing this config string.</strong>{" "}
                  It will contain your API keys in an encoded (not encrypted)
                  format. Anyone with this string can decode and use your keys.
                </p>
              </div>
            ) : null}

            <Button onClick={handleExport} className="w-full">
              Generate Config String
            </Button>

            {exportString ? (
              <div className="space-y-2">
                <textarea
                  readOnly
                  value={exportString}
                  className="w-full rounded-md border border-border bg-card-elevated p-3 text-xs font-mono text-foreground break-all resize-none focus:outline-none focus:border-border-accent focus:ring-1 focus:ring-ring"
                  rows={4}
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                />
                <Button
                  variant="secondary"
                  onClick={handleCopy}
                  className="w-full"
                >
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4 text-success" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            ) : null}

            {/* QR Code — API Keys only */}
            <div className="border-t border-border pt-4 space-y-2">
              <Button
                variant="secondary"
                onClick={handleShowQr}
                className="w-full"
              >
                <QrCode className="mr-2 h-4 w-4" />
                QR Code (API Keys)
              </Button>
              <p className="text-xs text-foreground-muted text-center">
                Generates a QR code containing only your API keys for easy mobile setup
              </p>

              {qrError ? (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-error-muted p-3">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                  <p className="text-xs text-destructive">{qrError}</p>
                </div>
              ) : null}

              {qrDataUrl ? (
                <div className="flex flex-col items-center gap-2 rounded-md border border-border bg-white p-4">
                  <img
                    src={qrDataUrl}
                    alt="QR code to import API keys"
                    width={350}
                    height={350}
                  />
                  <p className="text-xs text-foreground-muted">
                    Scan to import API keys on another device
                  </p>
                </div>
              ) : null}
            </div>
          </TabsContent>

          {/* Import Tab */}
          <TabsContent value="import" className="space-y-4 pt-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="import-config" className="text-sm font-medium">
                  Paste config string
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePaste}
                  className="h-7 px-2 text-xs"
                >
                  <ClipboardPaste className="mr-1.5 h-3.5 w-3.5" />
                  Paste
                </Button>
              </div>
              <textarea
                id="import-config"
                value={importValue}
                onChange={handleImportValueChange}
                placeholder="CFG1_..."
                className="w-full rounded-md border border-border bg-card-elevated p-3 text-xs font-mono text-foreground break-all resize-none placeholder:text-foreground-muted focus:outline-none focus:border-border-accent focus:ring-1 focus:ring-ring"
                rows={4}
              />
            </div>

            {importError ? (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-error-muted p-3">
                <AlertTriangle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                <p className="text-xs text-destructive">{importError}</p>
              </div>
            ) : null}

            {importPreview ? (
              <div className="space-y-2">
                <div className="flex items-start gap-2 rounded-md border border-border bg-card-elevated p-3">
                  <Info className="h-4 w-4 shrink-0 text-foreground-muted mt-0.5" />
                  <div className="text-xs text-foreground-secondary space-y-1">
                    <p>
                      Ready to import{" "}
                      <strong className="text-foreground">
                        {importPreview.keyCount} setting{importPreview.keyCount !== 1 ? "s" : ""}
                      </strong>
                    </p>
                    {importPreview.hasApiKeys ? (
                      <p className="text-warning">
                        This config includes API keys which will overwrite your
                        current keys.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            <Button
              onClick={handleImport}
              disabled={!importPreview || !!importError}
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              Import Settings
            </Button>

            <p className="text-xs text-foreground-muted text-center">
              Existing settings with matching keys will be overwritten.
              The page will need to be reloaded after import.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
