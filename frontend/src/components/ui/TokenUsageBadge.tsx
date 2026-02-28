"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatTokenCount, formatTokenCountExact } from "@/lib/token-utils";
import { cn } from "@/lib/utils";
import type { TokenUsage } from "@/lib/types";

interface TokenUsageBadgeProps {
  /** Cumulative session usage (sum of all requests). Shown in tooltip. */
  usage: TokenUsage | null | undefined;
  /** Last single-request usage. Compared against contextWindow for the badge label. */
  lastRequestUsage?: TokenUsage | null;
  contextWindow?: number;
  className?: string;
}

export function TokenUsageBadge({ usage, lastRequestUsage, contextWindow, className }: TokenUsageBadgeProps) {
  if (!usage || usage.total_tokens === 0) return null;

  // For context window comparison, use per-request input tokens (what actually fills the window)
  const perRequestInput = lastRequestUsage?.input_tokens ?? 0;
  const ratio = contextWindow && perRequestInput ? perRequestInput / contextWindow : 0;
  const isHigh = ratio >= 0.9;

  // Badge label: show per-request input vs context window when available
  const label = contextWindow && lastRequestUsage
    ? `${formatTokenCount(perRequestInput)} / ${formatTokenCount(contextWindow)}`
    : `${formatTokenCount(usage.total_tokens)} tokens`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center text-xs font-medium tabular-nums",
            isHigh ? "text-destructive" : "text-foreground-muted",
            className,
          )}
        >
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <div className="space-y-0.5">
          {lastRequestUsage && (
            <>
              <div className="font-medium text-foreground-muted">Last request</div>
              <div>Input: {formatTokenCountExact(lastRequestUsage.input_tokens)}</div>
              <div>Output: {formatTokenCountExact(lastRequestUsage.output_tokens)}</div>
            </>
          )}
          <div className="font-medium text-foreground-muted mt-1">Session total</div>
          <div>Input: {formatTokenCountExact(usage.input_tokens)}</div>
          <div>Output: {formatTokenCountExact(usage.output_tokens)}</div>
          <div className="font-medium">Total: {formatTokenCountExact(usage.total_tokens)}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
