import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Try to extract a date from a filename by matching common patterns.
 * Returns an ISO date string (yyyy-MM-dd) or null if no date is found.
 *
 * Supported patterns (with separators: - _ .):
 *   yyyy-MM-dd, dd-MM-yyyy, yyyyMMdd
 */
export function extractDateFromFilename(filename: string): string | null {
  // Strip file extension
  const name = filename.replace(/\.[^.]+$/, "");

  // yyyy<sep>MM<sep>dd  (ISO-like)
  const isoMatch = name.match(/(?:^|[^0-9])(20[0-9]{2})[._-](0[1-9]|1[0-2])[._-](0[1-9]|[12][0-9]|3[01])(?:[^0-9]|$)/);
  if (isoMatch) {
    const d = buildDate(+isoMatch[1], +isoMatch[2], +isoMatch[3]);
    if (d) return d;
  }

  // dd<sep>MM<sep>yyyy  (European)
  const euMatch = name.match(/(?:^|[^0-9])(0[1-9]|[12][0-9]|3[01])[._-](0[1-9]|1[0-2])[._-](20[0-9]{2})(?:[^0-9]|$)/);
  if (euMatch) {
    const d = buildDate(+euMatch[3], +euMatch[2], +euMatch[1]);
    if (d) return d;
  }

  // yyyyMMdd  (compact, no separators)
  const compactMatch = name.match(/(?:^|[^0-9])(20[0-9]{2})(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])(?:[^0-9]|$)/);
  if (compactMatch) {
    const d = buildDate(+compactMatch[1], +compactMatch[2], +compactMatch[3]);
    if (d) return d;
  }

  return null;
}

/** Build and validate a date, returning yyyy-MM-dd or null. */
function buildDate(year: number, month: number, day: number): string | null {
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
    return date.toISOString().split("T")[0];
  }
  return null;
}
