"use client";

import { useState, useCallback, useEffect } from "react";
import type { TokenUsageEntry } from "@/lib/types";

const STORAGE_KEY = "aias:v1:token_usage_history";
const MAX_ENTRIES = 10_000;

function loadHistory(): TokenUsageEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TokenUsageEntry[];
  } catch {
    return [];
  }
}

function saveHistory(entries: TokenUsageEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage full or unavailable
  }
}

export function useTokenUsage() {
  const [usageHistory, setUsageHistory] = useState<TokenUsageEntry[]>(() => loadHistory());

  // Sync from localStorage on mount (handles cross-tab updates)
  useEffect(() => {
    setUsageHistory(loadHistory());
  }, []);

  const recordUsage = useCallback(
    (entry: Omit<TokenUsageEntry, "timestamp">) => {
      setUsageHistory((prev) => {
        const updated = [...prev, { ...entry, timestamp: Date.now() }];
        // Cap at MAX_ENTRIES (trim oldest)
        const capped = updated.length > MAX_ENTRIES ? updated.slice(-MAX_ENTRIES) : updated;
        saveHistory(capped);
        return capped;
      });
    },
    [],
  );

  const clearHistory = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setUsageHistory([]);
  }, []);

  return { usageHistory, recordUsage, clearHistory };
}
