"use client";

import { useSession, signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UserMenu() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  const initial = session.user.name?.charAt(0) ?? session.user.email?.charAt(0) ?? "?";

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-sm text-foreground-secondary md:inline">
        {session.user.email}
      </span>
      {session.user.image ? (
        <img
          src={session.user.image}
          alt=""
          className="h-7 w-7 rounded-full"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
          {initial.toUpperCase()}
        </div>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => signOut()}
        className="text-foreground-secondary hover:text-foreground"
        aria-label="Sign out"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
