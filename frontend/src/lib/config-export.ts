import { deflate, inflate } from "pako";

const CONFIG_PREFIX = "CFG1_";
const SETTINGS_PREFIX = "aias:v1:";
const API_KEY_PREFIX = "aias:v1:apikey:";

/**
 * Collect all aias:v1:* settings from localStorage.
 * @param includeApiKeys - Whether to include API keys (aias:v1:apikey:*).
 */
export function collectSettings(includeApiKeys: boolean): Record<string, string> {
  const settings: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(SETTINGS_PREFIX)) continue;
      if (!includeApiKeys && key.startsWith(API_KEY_PREFIX)) continue;
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
 * Format: CFG1_ + Base64(pako.deflate(JSON.stringify(settings)))
 */
export function exportSettings(includeApiKeys: boolean): string {
  const settings = collectSettings(includeApiKeys);
  const json = JSON.stringify(settings);
  const compressed = deflate(new TextEncoder().encode(json));
  const base64 = btoa(String.fromCharCode(...compressed));
  return CONFIG_PREFIX + base64;
}

/**
 * Parse and validate a config string. Returns the settings object or throws.
 */
export function parseConfigString(configString: string): Record<string, string> {
  const trimmed = configString.trim();
  if (!trimmed.startsWith(CONFIG_PREFIX)) {
    throw new Error("Invalid config string: missing version prefix");
  }

  const base64 = trimmed.slice(CONFIG_PREFIX.length);
  if (!base64) {
    throw new Error("Invalid config string: empty payload");
  }

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
