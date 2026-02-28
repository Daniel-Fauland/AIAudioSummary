import type { ConfigResponse } from "./types";

/**
 * Format a token count for display.
 * < 1000: exact number (e.g. "842")
 * >= 1000: "Xk" (e.g. "12k", "1.2k")
 * >= 1M: "X.Xm" (e.g. "1.2m")
 */
export function formatTokenCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const k = n / 1000;
    return k >= 10 ? `${Math.round(k)}k` : `${k.toFixed(1).replace(/\.0$/, "")}k`;
  }
  const m = n / 1_000_000;
  return `${m.toFixed(1).replace(/\.0$/, "")}m`;
}

/**
 * Format a number with locale-specific thousand separators (e.g. "12,345").
 */
export function formatTokenCountExact(n: number): string {
  return n.toLocaleString();
}

/**
 * Look up the context window size for a given provider + model from the config.
 */
export function getContextWindow(
  config: ConfigResponse | null,
  provider: string,
  model: string,
): number | undefined {
  if (!config) return undefined;
  const providerInfo = config.providers.find((p) => p.id === provider);
  return providerInfo?.model_context_windows?.[model];
}
