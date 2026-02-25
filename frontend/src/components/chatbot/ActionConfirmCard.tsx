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
      {action.action_id === "save_prompt_template" && action.params.name && action.params.content ? (
        <div className="text-xs bg-muted/50 rounded px-2 py-1 space-y-1">
          <div className="font-medium text-foreground">{action.params.name as string}</div>
          <div className="max-h-40 overflow-y-auto whitespace-pre-wrap text-foreground-muted font-mono">
            {action.params.content as string}
          </div>
        </div>
      ) : action.action_id === "save_form_template" && action.params.name && Array.isArray(action.params.fields) ? (
        <div className="text-xs bg-muted/50 rounded px-2 py-1 space-y-1">
          <div className="font-medium text-foreground">{action.params.name as string}</div>
          <div className="max-h-40 overflow-y-auto space-y-0.5">
            {(action.params.fields as Array<Record<string, unknown>>).map((field, i) => (
              <div key={i} className="text-foreground-muted">
                <span className="font-medium text-foreground">{field.label as string}</span>
                {" "}
                <span className="text-foreground-muted">({field.type as string})</span>
                {typeof field.description === "string" && field.description && (
                  <span className="text-foreground-muted"> — {field.description}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : Object.keys(displayParams).length > 0 ? (
        <div className="text-xs text-foreground-muted font-mono bg-muted/50 rounded px-2 py-1">
          {JSON.stringify(displayParams)}
        </div>
      ) : null}

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
