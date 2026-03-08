"use client";

import { useState, useCallback } from "react";
import type { KeytermsList } from "@/lib/types";

const STORAGE_KEY = "aias:v1:keyterms_lists";

function loadLists(): KeytermsList[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as KeytermsList[];
  } catch {
    return [];
  }
}

function persistLists(lists: KeytermsList[]): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
    }
  } catch {
    // localStorage might be full or disabled
  }
}

export function useKeytermsLists() {
  const [lists, setLists] = useState<KeytermsList[]>(loadLists);

  const saveList = useCallback((list: KeytermsList) => {
    setLists((prev) => {
      const updated = [...prev, list];
      persistLists(updated);
      return updated;
    });
  }, []);

  const updateList = useCallback((list: KeytermsList) => {
    setLists((prev) => {
      const updated = prev.map((l) => (l.id === list.id ? list : l));
      persistLists(updated);
      return updated;
    });
  }, []);

  const deleteList = useCallback((id: string) => {
    setLists((prev) => {
      const updated = prev.filter((l) => l.id !== id);
      persistLists(updated);
      return updated;
    });
  }, []);

  return { lists, saveList, updateList, deleteList };
}
