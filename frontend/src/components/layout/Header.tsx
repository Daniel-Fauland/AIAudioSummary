"use client";

import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/auth/UserMenu";

interface HeaderProps {
  onSettingsClick: () => void;
}

export function Header({ onSettingsClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6">
      <h1 className="text-2xl font-bold text-foreground">AI Audio Summary</h1>
      <div className="flex items-center gap-2">
        <UserMenu />
        <Button
          variant="ghost"
          size="icon"
          onClick={onSettingsClick}
          className="text-foreground-secondary hover:text-foreground"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
