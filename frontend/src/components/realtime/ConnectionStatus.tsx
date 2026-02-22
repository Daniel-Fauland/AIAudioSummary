"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { RealtimeConnectionStatus } from "@/lib/types";

interface ConnectionStatusProps {
  status: RealtimeConnectionStatus;
}

const statusLabels: Record<RealtimeConnectionStatus, string> = {
  connected: "Connected",
  connecting: "Connecting...",
  reconnecting: "Reconnecting...",
  disconnected: "Disconnected",
  error: "Error",
};

const statusClasses: Record<RealtimeConnectionStatus, string> = {
  connected: "bg-success",
  connecting: "bg-warning animate-pulse",
  reconnecting: "bg-warning animate-pulse",
  disconnected: "bg-foreground-muted",
  error: "bg-destructive",
};

export function ConnectionStatus({ status }: ConnectionStatusProps) {
  return (
    <Tooltip>
      <TooltipTrigger className="flex items-center cursor-default focus:outline-none">
        <div className={`h-2.5 w-2.5 rounded-full ${statusClasses[status]}`} />
      </TooltipTrigger>
      <TooltipContent>{statusLabels[status]}</TooltipContent>
    </Tooltip>
  );
}
