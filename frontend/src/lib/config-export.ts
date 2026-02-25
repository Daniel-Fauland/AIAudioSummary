import { deflate, inflate } from "pako";

const CONFIG_PREFIX = "CFG1_";
const SETTINGS_PREFIX = "aias:v1:";
const API_KEY_PREFIX = "aias:v1:apikey:";
const SESSION_PREFIX = "aias:v1:session:";
const CHATBOT_PREFIX = "aias:v1:chatbot";
const AZURE_PREFIX = "aias:v1:azure:";
const LANGDOCK_KEY = "aias:v1:langdock_config";

/** Standard Base64 → Base64URL (URL-safe, no padding) */
function toBase64Url(base64: string): string {
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Base64URL → Standard Base64 (restores padding) */
function fromBase64Url(base64url: string): string {
  let s = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4;
  if (pad === 2) s += "==";
  else if (pad === 3) s += "=";
  return s;
}

interface CollectOptions {
  includeApiKeys?: boolean;
  includeSessionData?: boolean;
}

/**
 * Collect all aias:v1:* settings from localStorage.
 */
export function collectSettings(options: CollectOptions = {}): Record<string, string> {
  const { includeApiKeys = false, includeSessionData = true } = options;
  const settings: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(SETTINGS_PREFIX)) continue;
      if (!includeApiKeys && key.startsWith(API_KEY_PREFIX)) continue;
      if (!includeSessionData && (key.startsWith(SESSION_PREFIX) || key.startsWith(CHATBOT_PREFIX))) continue;
      const value = localStorage.getItem(key);
      if (value !== null) settings[key] = value;
    }
  } catch {
    // localStorage unavailable
  }
  return settings;
}

/**
 * Serialize settings to a portable config string.
 * Format: CFG1_ + Base64URL(pako.deflate(JSON.stringify(settings)))
 */
export function exportSettings(options: CollectOptions = {}): string {
  const settings = collectSettings(options);
  const json = JSON.stringify(settings);
  const compressed = deflate(new TextEncoder().encode(json));
  const base64 = btoa(Array.from(compressed, (b) => String.fromCharCode(b)).join(""));
  return CONFIG_PREFIX + toBase64Url(base64);
}

/**
 * Parse and validate a config string. Returns the settings object or throws.
 */
export function parseConfigString(configString: string): Record<string, string> {
  const trimmed = configString.trim();
  if (!trimmed.startsWith(CONFIG_PREFIX)) {
    throw new Error("Invalid config string: missing version prefix");
  }

  const raw = trimmed.slice(CONFIG_PREFIX.length);
  if (!raw) {
    throw new Error("Invalid config string: empty payload");
  }

  // Convert Base64URL → standard Base64 (also handles legacy standard Base64 transparently)
  const base64 = fromBase64Url(raw);

  let binary: string;
  try {
    binary = atob(base64);
  } catch {
    throw new Error("Invalid config string: malformed Base64");
  }

  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  let json: string;
  try {
    json = new TextDecoder().decode(inflate(bytes));
  } catch {
    throw new Error("Invalid config string: decompression failed");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Invalid config string: invalid JSON");
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Invalid config string: expected key-value object");
  }

  // Validate all keys have the expected prefix and values are strings
  const settings = parsed as Record<string, unknown>;
  for (const [key, value] of Object.entries(settings)) {
    if (!key.startsWith(SETTINGS_PREFIX)) {
      throw new Error(`Invalid config string: unexpected key "${key}"`);
    }
    if (typeof value !== "string") {
      throw new Error(`Invalid config string: value for "${key}" is not a string`);
    }
  }

  return settings as Record<string, string>;
}

/**
 * Import settings into localStorage. Returns the number of keys written.
 */
export function importSettings(configString: string): number {
  const settings = parseConfigString(configString);
  let count = 0;
  try {
    for (const [key, value] of Object.entries(settings)) {
      localStorage.setItem(key, value);
      count++;
    }
  } catch {
    throw new Error("Failed to write settings to localStorage");
  }
  return count;
}

/**
 * Check whether a parsed config contains API keys.
 */
export function configContainsApiKeys(settings: Record<string, string>): boolean {
  return Object.keys(settings).some((key) => key.startsWith(API_KEY_PREFIX));
}

/**
 * Build a full import URL for the given config string.
 */
export function buildImportUrl(configString: string): string {
  return `${window.location.origin}/?import=${encodeURIComponent(configString)}`;
}

/**
 * Export only API keys and related connection config (Azure, Langdock).
 * Produces a compact config string suitable for QR codes.
 * Throws if no API keys are found.
 */
export function exportApiKeys(): string {
  const settings: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (
        key.startsWith(API_KEY_PREFIX) ||
        key.startsWith(AZURE_PREFIX) ||
        key === LANGDOCK_KEY
      ) {
        const value = localStorage.getItem(key);
        if (value !== null) settings[key] = value;
      }
    }
  } catch {
    // localStorage unavailable
  }
  if (Object.keys(settings).length === 0) {
    throw new Error("No API keys configured. Add your API keys in Settings first.");
  }
  const json = JSON.stringify(settings);
  const compressed = deflate(new TextEncoder().encode(json));
  const base64 = btoa(Array.from(compressed, (b) => String.fromCharCode(b)).join(""));
  return CONFIG_PREFIX + toBase64Url(base64);
}

/** Practical URL-length ceiling for reliable QR scanning on phones (~350px image). */
export const QR_URL_MAX_LENGTH = 1000;
