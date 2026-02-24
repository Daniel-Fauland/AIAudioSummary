"use client";

import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatbotFABProps {
  onClick: () => void;
  isOpen: boolean;
  isSettingsOpen?: boolean;
}

export function ChatbotFAB({ onClick, isOpen, isSettingsOpen }: ChatbotFABProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "fixed bottom-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300 ease-in-out hover:scale-105 active:scale-95",
        isSettingsOpen ? "right-[404px]" : "right-6",
        isOpen && "scale-0 pointer-events-none",
      )}
      title="Open AI Assistant"
    >
      <MessageCircle className="h-6 w-6" />
    </button>
  );
}
