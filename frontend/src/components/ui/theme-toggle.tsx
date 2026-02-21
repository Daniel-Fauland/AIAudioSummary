"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";

const themeConfig = [
  { value: "light", icon: Sun, label: "Light mode" },
  { value: "dark", icon: Moon, label: "Dark mode" },
  { value: "system", icon: Monitor, label: "System theme" },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" disabled aria-label="Theme">
        <Monitor className="h-5 w-5" />
      </Button>
    );
  }

  const currentIndex = themeConfig.findIndex((t) => t.value === theme);
  const current = themeConfig[currentIndex === -1 ? 2 : currentIndex];
  const next = themeConfig[(currentIndex + 1) % themeConfig.length];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(next.value)}
          aria-label={current.label}
          className="text-foreground-secondary hover:text-foreground"
        >
          <current.icon className="h-5 w-5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{current.label}</TooltipContent>
    </Tooltip>
  );
}
