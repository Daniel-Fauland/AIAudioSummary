"use client";

import { Zap, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActionProposal } from "@/lib/types";

interface ActionConfirmCardProps {
  action: ActionProposal;
  status: "pending" | "confirmed" | "cancelled" | "error";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ActionConfirmCard({ action, status, onConfirm, onCancel }: ActionConfirmCardProps) {
  const isSensitive = action.action_id === "update_api_key";

  // Mask sensitive params
  const displayParams = isSensitive
    ? { ...action.params, key: "••••••••" }
    : action.params;

  return (
    <div className="my-2 rounded-lg border-l-4 border-l-primary bg-card p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-foreground-secondary">
        <Zap className="h-3.5 w-3.5 text-primary" />
        Proposed Action
      </div>
      <p className="text-sm text-foreground">{action.description}</p>
      {Object.keys(displayParams).length > 0 && (
        <div className="text-xs text-foreground-muted font-mono bg-muted/50 rounded px-2 py-1">
          {JSON.stringify(displayParams)}
        </div>
      )}

      {status === "pending" && (
        <div className="flex items-center gap-2 pt-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onCancel}>
            <X className="h-3 w-3 mr-1" />
            Abort
          </Button>
          <Button size="sm" className="h-7 text-xs" onClick={onConfirm}>
            <Check className="h-3 w-3 mr-1" />
            Confirm
          </Button>
        </div>
      )}

      {status === "confirmed" && (
        <div className="flex items-center gap-1.5 text-xs text-green-500">
          <Check className="h-3.5 w-3.5" />
          Action completed
        </div>
      )}

      {status === "cancelled" && (
        <p className="text-xs text-foreground-muted">Action cancelled</p>
      )}

      {status === "error" && (
        <p className="text-xs text-destructive">Action failed</p>
      )}
    </div>
  );
}
