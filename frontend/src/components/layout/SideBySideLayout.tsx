"use client";

import { useRef, useEffect, useState, type ReactNode } from "react";

interface SideBySideLayoutProps {
  left: ReactNode;
  right: ReactNode;
}

/**
 * Two-column layout where the right column determines the row height
 * and the left column matches it (with internal scrolling if needed).
 */
export function SideBySideLayout({ left, right }: SideBySideLayoutProps) {
  const rightRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const el = rightRef.current;
    if (!el) return;

    const update = () => setHeight(el.offsetHeight);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 items-start">
      <div style={height ? { height } : undefined} className="overflow-hidden">
        {left}
      </div>
      <div ref={rightRef}>
        {right}
      </div>
    </div>
  );
}
