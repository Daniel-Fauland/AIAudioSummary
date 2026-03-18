"use client";

import { useEffect, useRef } from "react";

export function AutoLogin({ action }: { action: () => Promise<void> }) {
  const submitted = useRef(false);

  useEffect(() => {
    if (submitted.current) return;
    submitted.current = true;
    action();
  }, [action]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-foreground-secondary">Signing in…</p>
    </div>
  );
}
