"use client";

import { useState, useCallback } from "react";
import type { FormTemplate } from "@/lib/types";

const STORAGE_KEY = "aias:v1:form_templates";

function loadTemplates(): FormTemplate[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FormTemplate[];
  } catch {
    return [];
  }
}

function persistTemplates(templates: FormTemplate[]): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    }
  } catch {
    // localStorage might be full or disabled
  }
}

export function useFormTemplates() {
  const [templates, setTemplates] = useState<FormTemplate[]>(loadTemplates);

  const saveTemplate = useCallback((template: FormTemplate) => {
    setTemplates((prev) => {
      const updated = [...prev, template];
      persistTemplates(updated);
      return updated;
    });
  }, []);

  const updateTemplate = useCallback((template: FormTemplate) => {
    setTemplates((prev) => {
      const updated = prev.map((t) => (t.id === template.id ? template : t));
      persistTemplates(updated);
      return updated;
    });
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    setTemplates((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      persistTemplates(updated);
      return updated;
    });
  }, []);

  return { templates, saveTemplate, updateTemplate, deleteTemplate };
}
