"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { formatTokenCount, formatTokenCountExact } from "@/lib/token-utils";
import type { TokenUsageEntry } from "@/lib/types";

type Period = "1w" | "1m" | "1y";
type TokenMode = "total" | "input" | "output";

interface AIUsageDialogProps {
  open: boolean;
  onClose: () => void;
  usageHistory: TokenUsageEntry[];
  onClearHistory: () => void;
}

function getDateKey(ts: number, period: Period): string {
  const d = new Date(ts);
  if (period === "1y") {
    // Weekly aggregation: ISO week start (Monday)
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.getFullYear(), d.getMonth(), diff);
    return monday.toISOString().slice(0, 10);
  }
  // Daily aggregation
  return d.toISOString().slice(0, 10);
}

function formatDateLabel(key: string, period: Period): string {
  const d = new Date(key + "T00:00:00");
  if (period === "1y") {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getPeriodCutoff(period: Period): number {
  const now = Date.now();
  switch (period) {
    case "1w":
      return now - 7 * 24 * 60 * 60 * 1000;
    case "1m":
      return now - 30 * 24 * 60 * 60 * 1000;
    case "1y":
      return now - 365 * 24 * 60 * 60 * 1000;
  }
}

export function AIUsageDialog({
  open,
  onClose,
  usageHistory,
  onClearHistory,
}: AIUsageDialogProps) {
  const [period, setPeriod] = useState<Period>("1m");
  const [tokenMode, setTokenMode] = useState<TokenMode>("total");
  const [confirmClear, setConfirmClear] = useState(false);

  const filteredData = useMemo(() => {
    const cutoff = getPeriodCutoff(period);
    return usageHistory.filter((e) => e.timestamp >= cutoff);
  }, [usageHistory, period]);

  const chartData = useMemo(() => {
    const buckets = new Map<string, { input: number; output: number }>();
    for (const entry of filteredData) {
      const key = getDateKey(entry.timestamp, period);
      const existing = buckets.get(key) ?? { input: 0, output: 0 };
      existing.input += entry.input_tokens;
      existing.output += entry.output_tokens;
      buckets.set(key, existing);
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => ({
        date: key,
        label: formatDateLabel(key, period),
        input: val.input,
        output: val.output,
        total: val.input + val.output,
      }));
  }, [filteredData, period]);

  const stats = useMemo(() => {
    let totalInput = 0;
    let totalOutput = 0;
    let totalRequests = 0;
    const modelCounts = new Map<string, number>();

    for (const entry of filteredData) {
      totalInput += entry.input_tokens;
      totalOutput += entry.output_tokens;
      totalRequests += 1;
      const count = modelCounts.get(entry.model) ?? 0;
      modelCounts.set(entry.model, count + 1);
    }

    let mostUsedModel = "—";
    let maxCount = 0;
    for (const [model, count] of modelCounts) {
      if (count > maxCount) {
        maxCount = count;
        mostUsedModel = model;
      }
    }

    return { totalInput, totalOutput, totalRequests, mostUsedModel };
  }, [filteredData]);

  const isEmpty = usageHistory.length === 0;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI Usage</DialogTitle>
            <DialogDescription>Token usage across all AI features.</DialogDescription>
          </DialogHeader>

          {isEmpty ? (
            <div className="py-12 text-center text-sm text-foreground-muted">
              No usage data yet. Token usage will appear here after your first AI interaction.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Period & Mode Controls */}
              <div className="flex items-center justify-between gap-2">
                <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
                  <TabsList>
                    <TabsTrigger value="1w">1 Week</TabsTrigger>
                    <TabsTrigger value="1m">1 Month</TabsTrigger>
                    <TabsTrigger value="1y">1 Year</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Tabs value={tokenMode} onValueChange={(v) => setTokenMode(v as TokenMode)}>
                  <TabsList>
                    <TabsTrigger value="total">Total</TabsTrigger>
                    <TabsTrigger value="input">Input</TabsTrigger>
                    <TabsTrigger value="output">Output</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Chart */}
              {chartData.length > 0 ? (
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11 }}
                        className="fill-foreground-muted"
                      />
                      <YAxis
                        tickFormatter={(v: number) => formatTokenCount(v)}
                        tick={{ fontSize: 11 }}
                        className="fill-foreground-muted"
                        width={50}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={((value: number, name: string) => [
                          formatTokenCountExact(value ?? 0),
                          name.charAt(0).toUpperCase() + name.slice(1),
                        ]) as any}
                      />
                      {(tokenMode === "total" || tokenMode === "input") && (
                        <Area
                          type="monotone"
                          dataKey="input"
                          stackId="1"
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary) / 0.3)"
                          name="Input"
                        />
                      )}
                      {(tokenMode === "total" || tokenMode === "output") && (
                        <Area
                          type="monotone"
                          dataKey="output"
                          stackId={tokenMode === "total" ? "1" : "2"}
                          stroke="hsl(142 71% 45%)"
                          fill="hsl(142 71% 45% / 0.3)"
                          name="Output"
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-foreground-muted">
                  No data for this period.
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-border p-3">
                  <div className="text-foreground-muted">Input Tokens</div>
                  <div className="text-lg font-semibold tabular-nums">
                    {formatTokenCountExact(stats.totalInput)}
                  </div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-foreground-muted">Output Tokens</div>
                  <div className="text-lg font-semibold tabular-nums">
                    {formatTokenCountExact(stats.totalOutput)}
                  </div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-foreground-muted">Total Requests</div>
                  <div className="text-lg font-semibold tabular-nums">
                    {stats.totalRequests.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-foreground-muted">Most Used Model</div>
                  <div className="text-lg font-semibold truncate" title={stats.mostUsedModel}>
                    {stats.mostUsedModel}
                  </div>
                </div>
              </div>

              {/* Clear */}
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmClear(true)}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Clear History
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear usage history?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all recorded token usage data. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onClearHistory();
                setConfirmClear(false);
              }}
            >
              Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
