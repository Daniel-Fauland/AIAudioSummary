"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getPreferences, putPreferences, deletePreferences } from "@/lib/api";

interface StorageModeDialogProps {
  open: boolean;
  currentMode: "local" | "account";
  onClose: () => void;
  onModeChanged: (newMode: "local" | "account") => void;
}

function safeLocalSet(key: string, value: string): void {
  try {
    if (typeof window !== "undefined") localStorage.setItem(key, value);
  } catch {}
}

const ALL_PROVIDERS = ["openai", "anthropic", "gemini", "azure_openai", "langdock"];

function collectLocalPreferences() {
  const models: Record<string, string> = {};
  for (const p of ALL_PROVIDERS) {
    try {
      const model = localStorage.getItem(`aias:v1:model:${p}`);
      if (model) models[p] = model;
    } catch {}
  }

  let featureOverrides: Record<string, unknown> = {};
  try {
    const raw = localStorage.getItem("aias:v1:feature_overrides");
    if (raw) featureOverrides = JSON.parse(raw);
  } catch {}

  function get(key: string) {
    try { return localStorage.getItem(key) || undefined; } catch { return undefined; }
  }

  let customTemplates: { id: string; name: string; content: string }[] | undefined;
  try {
    const raw = get("aias:v1:custom_templates");
    if (raw) customTemplates = JSON.parse(raw);
  } catch {}

  const autoKeyPoints = get("aias:v1:auto_key_points");
  const minSpeakers = parseInt(get("aias:v1:min_speakers") ?? "");
  const maxSpeakers = parseInt(get("aias:v1:max_speakers") ?? "");
  const realtimeFinalSummary = get("aias:v1:realtime_final_summary");

  return {
    selected_provider: get("aias:v1:selected_provider"),
    models,
    app_mode: get("aias:v1:app_mode"),
    realtime_interval: parseInt(get("aias:v1:realtime_interval") ?? "2") || undefined,
    feature_overrides: featureOverrides,
    theme: get("aias:v1:theme"),
    azure: {
      api_version: get("aias:v1:azure:api_version"),
      endpoint: get("aias:v1:azure:endpoint"),
      deployment_name: get("aias:v1:azure:deployment_name"),
    },
    auto_key_points: autoKeyPoints ? autoKeyPoints !== "false" : undefined,
    min_speakers: minSpeakers || undefined,
    max_speakers: maxSpeakers || undefined,
    realtime_final_summary: realtimeFinalSummary ? realtimeFinalSummary !== "false" : undefined,
    realtime_system_prompt: get("aias:v1:realtime_system_prompt"),
    custom_templates: customTemplates,
  };
}

export function StorageModeDialog({ open, currentMode, onClose, onModeChanged }: StorageModeDialogProps) {
  const [loading, setLoading] = useState(false);

  async function handleEnableAccount() {
    setLoading(true);
    try {
      const prefs = collectLocalPreferences();
      await putPreferences(prefs);
      onModeChanged("account");
      toast.success("Account storage enabled. Your preferences are now synced.");
      onClose();
    } catch {
      toast.error("Failed to enable account storage. Please try again.");
      onClose();
    } finally {
      setLoading(false);
    }
  }

  async function handleSwitchToLocal() {
    setLoading(true);
    try {
      // Fetch latest server prefs and write to localStorage
      const prefsData = await getPreferences();
      if (prefsData.preferences) {
        const p = prefsData.preferences;
        if (p.selected_provider) safeLocalSet("aias:v1:selected_provider", p.selected_provider);
        if (p.models) {
          for (const [provider, model] of Object.entries(p.models)) {
            if (model) safeLocalSet(`aias:v1:model:${provider}`, model);
          }
        }
        if (p.app_mode) safeLocalSet("aias:v1:app_mode", p.app_mode);
        if (p.realtime_interval) safeLocalSet("aias:v1:realtime_interval", String(p.realtime_interval));
        if (p.feature_overrides) safeLocalSet("aias:v1:feature_overrides", JSON.stringify(p.feature_overrides));
        if (p.theme) safeLocalSet("aias:v1:theme", p.theme);
        if (p.azure?.api_version) safeLocalSet("aias:v1:azure:api_version", p.azure.api_version);
        if (p.azure?.endpoint) safeLocalSet("aias:v1:azure:endpoint", p.azure.endpoint);
        if (p.azure?.deployment_name) safeLocalSet("aias:v1:azure:deployment_name", p.azure.deployment_name);
        if (p.auto_key_points !== undefined) safeLocalSet("aias:v1:auto_key_points", p.auto_key_points ? "true" : "false");
        if (p.min_speakers) safeLocalSet("aias:v1:min_speakers", String(p.min_speakers));
        if (p.max_speakers) safeLocalSet("aias:v1:max_speakers", String(p.max_speakers));
        if (p.realtime_final_summary !== undefined) safeLocalSet("aias:v1:realtime_final_summary", p.realtime_final_summary ? "true" : "false");
        if (p.realtime_system_prompt) safeLocalSet("aias:v1:realtime_system_prompt", p.realtime_system_prompt);
        if (p.custom_templates) safeLocalSet("aias:v1:custom_templates", JSON.stringify(p.custom_templates));
      }
      // Clear from server
      await deletePreferences();
      onModeChanged("local");
      toast.success("Switched to local storage. Your preferences have been downloaded.");
      onClose();
    } catch {
      toast.error("Failed to switch storage mode. Please try again.");
      onClose();
    } finally {
      setLoading(false);
    }
  }

  if (currentMode === "local") {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && !loading && onClose()}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Enable Account Storage</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-foreground-secondary">
              Your settings, prompt templates, and theme preferences will be stored on our server.
              This allows you to access your configuration from any device.{" "}
              <strong className="text-foreground">API keys are never stored on the server</strong>{" "}
              and will always remain in your browser. By enabling this, you consent to your
              preferences being stored on our server. You can switch back to local storage at any
              time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleEnableAccount} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enabling...
                </>
              ) : (
                "Enable Account Storage"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !loading && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Switch to Local Storage</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-foreground-secondary">
            Your settings will be downloaded to this browser and deleted from our server. If you
            use multiple devices, your settings will no longer sync between them.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={handleSwitchToLocal} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Switching...
              </>
            ) : (
              "Switch to Local"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
