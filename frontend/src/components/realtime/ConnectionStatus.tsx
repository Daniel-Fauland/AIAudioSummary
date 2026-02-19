"use client";

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

export function ConnectionStatus({ status }: ConnectionStatusProps) {
  return (
    <div className="flex items-center gap-2">
      <span className={`connection-dot ${status}`} />
      <span className="text-xs text-foreground-secondary">{statusLabels[status]}</span>
    </div>
  );
}
