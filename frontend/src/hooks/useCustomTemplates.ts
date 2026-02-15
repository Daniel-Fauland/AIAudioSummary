"use client";

import { useState, useCallback } from "react";
import type { PromptTemplate } from "@/lib/types";

const STORAGE_KEY = "aias:v1:custom_templates";

function loadTemplates(): PromptTemplate[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PromptTemplate[];
  } catch {
    return [];
  }
}

function persistTemplates(templates: PromptTemplate[]): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    }
  } catch {
    // localStorage might be full or disabled
  }
}

export function useCustomTemplates() {
  const [templates, setTemplates] = useState<PromptTemplate[]>(loadTemplates);

  const saveTemplate = useCallback((name: string, content: string) => {
    const id = `custom:${Date.now()}`;
    const newTemplate: PromptTemplate = { id, name, content };
    setTemplates((prev) => {
      const updated = [...prev, newTemplate];
      persistTemplates(updated);
      return updated;
    });
    return newTemplate;
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    setTemplates((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      persistTemplates(updated);
      return updated;
    });
  }, []);

  const updateTemplate = useCallback(
    (id: string, name: string, content: string) => {
      setTemplates((prev) => {
        const updated = prev.map((t) =>
          t.id === id ? { ...t, name, content } : t,
        );
        persistTemplates(updated);
        return updated;
      });
    },
    [],
  );

  return { templates, saveTemplate, deleteTemplate, updateTemplate };
}
