"use client";

import { useCallback } from "react";
import type { AzureConfig, LLMProvider } from "@/lib/types";

const KEY_PREFIX = "aias:v1:apikey:";
const AZURE_PREFIX = "aias:v1:azure:";
const ASSEMBLYAI_KEY = "aias:v1:apikey:assemblyai";

function safeGetItem(key: string): string {
  try {
    return typeof window !== "undefined"
      ? (localStorage.getItem(key) ?? "")
      : "";
  } catch {
    return "";
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, value);
    }
  } catch {
    // localStorage might be full or disabled
  }
}

function safeRemoveItem(key: string): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem(key);
    }
  } catch {
    // noop
  }
}

export function useApiKeys() {
  const getKey = useCallback((provider: LLMProvider | "assemblyai"): string => {
    if (provider === "assemblyai") return safeGetItem(ASSEMBLYAI_KEY);
    return safeGetItem(`${KEY_PREFIX}${provider}`);
  }, []);

  const setKey = useCallback(
    (provider: LLMProvider | "assemblyai", key: string): void => {
      if (provider === "assemblyai") {
        safeSetItem(ASSEMBLYAI_KEY, key);
      } else {
        safeSetItem(`${KEY_PREFIX}${provider}`, key);
      }
    },
    [],
  );

  const hasKey = useCallback(
    (provider: LLMProvider | "assemblyai"): boolean => {
      return getKey(provider).trim().length > 0;
    },
    [getKey],
  );

  const clearKey = useCallback(
    (provider: LLMProvider | "assemblyai"): void => {
      if (provider === "assemblyai") {
        safeRemoveItem(ASSEMBLYAI_KEY);
      } else {
        safeRemoveItem(`${KEY_PREFIX}${provider}`);
      }
    },
    [],
  );

  const getAzureConfig = useCallback((): AzureConfig | null => {
    const api_version = safeGetItem(`${AZURE_PREFIX}api_version`);
    const azure_endpoint = safeGetItem(`${AZURE_PREFIX}endpoint`);
    const deployment_name = safeGetItem(`${AZURE_PREFIX}deployment_name`);
    if (!api_version || !azure_endpoint || !deployment_name) return null;
    return { api_version, azure_endpoint, deployment_name };
  }, []);

  const setAzureConfig = useCallback((config: AzureConfig): void => {
    safeSetItem(`${AZURE_PREFIX}api_version`, config.api_version);
    safeSetItem(`${AZURE_PREFIX}endpoint`, config.azure_endpoint);
    safeSetItem(`${AZURE_PREFIX}deployment_name`, config.deployment_name);
  }, []);

  return { getKey, setKey, hasKey, clearKey, getAzureConfig, setAzureConfig };
}
