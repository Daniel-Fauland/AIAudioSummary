"use client";

import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UserMenu } from "@/components/auth/UserMenu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Logo } from "@/components/ui/Logo";
import type { TokenUsageEntry } from "@/lib/types";

interface HeaderProps {
  onSettingsClick: () => void;
  onStorageModeChange?: (mode: "local" | "account") => void;
  usageHistory?: TokenUsageEntry[];
  onClearUsageHistory?: () => void;
}

export function Header({ onSettingsClick, onStorageModeChange, usageHistory, onClearUsageHistory }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6">
      <Logo />
      <div className="flex items-center gap-2">
        <UserMenu onStorageModeChange={onStorageModeChange} usageHistory={usageHistory} onClearUsageHistory={onClearUsageHistory} />
        <ThemeToggle />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onSettingsClick}
              className="text-foreground-secondary hover:text-foreground"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Settings</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
