"use client";

import { type ReactNode } from "react";

interface SideBySideLayoutProps {
  left: ReactNode;
  right: ReactNode;
}

/**
 * Two-column layout where both columns share the same max height
 * and scroll their content independently.
 */
export function SideBySideLayout({ left, right }: SideBySideLayoutProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:h-[70vh]">
      <div className="min-h-0 h-full">
        {left}
      </div>
      <div className="min-h-0 h-full">
        {right}
      </div>
    </div>
  );
}
