"use client";

import { useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LogOut, Shield, HardDrive, Cloud, Loader2, ArrowLeftRight, BarChart3 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StorageModeDialog } from "@/components/auth/StorageModeDialog";
import { ConfigExportDialog } from "@/components/auth/ConfigExportDialog";
import { AIUsageDialog } from "@/components/auth/AIUsageDialog";
import { getMe } from "@/lib/api";
import type { TokenUsageEntry, UserProfile } from "@/lib/types";

interface UserMenuProps {
  onStorageModeChange?: (mode: "local" | "account") => void;
  usageHistory?: TokenUsageEntry[];
  onClearUsageHistory?: () => void;
}

export function UserMenu({ onStorageModeChange, usageHistory, onClearUsageHistory }: UserMenuProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [storageModeDialogOpen, setStorageModeDialogOpen] = useState(false);
  const [configExportDialogOpen, setConfigExportDialogOpen] = useState(false);
  const [aiUsageDialogOpen, setAiUsageDialogOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleOpenChange = useCallback(
    async (open: boolean) => {
      setDropdownOpen(open);
      if (open) {
        setLoadingProfile(true);
        try {
          const me = await getMe();
          setProfile(me);
        } catch {
          // silently fall back to session data
        } finally {
          setLoadingProfile(false);
        }
      }
    },
    [],
  );

  const handleStorageModeClick = useCallback(() => {
    setDropdownOpen(false);
    setStorageModeDialogOpen(true);
  }, []);

  const handleConfigExportClick = useCallback(() => {
    setDropdownOpen(false);
    setConfigExportDialogOpen(true);
  }, []);

  const handleAiUsageClick = useCallback(() => {
    setDropdownOpen(false);
    setAiUsageDialogOpen(true);
  }, []);

  const handleModeChanged = useCallback(
    (newMode: "local" | "account") => {
      setProfile((prev) => (prev ? { ...prev, storage_mode: newMode } : prev));
      onStorageModeChange?.(newMode);
    },
    [onStorageModeChange],
  );

  if (!session?.user) return null;

  const userEmail = session.user.email ?? "";
  const userName = session.user.name;
  const userImage = session.user.image;
  const sessionRole = (session.user as { role?: string }).role;
  const initial = (userName ?? userEmail)?.charAt(0)?.toUpperCase() ?? "?";

  // Use fetched profile data when available, otherwise fall back to session
  const currentStorageMode = (profile?.storage_mode ?? "local") as "local" | "account";
  // Only show Admin Panel when the DB-fetched profile confirms admin.
  // Do NOT fall back to the JWT session role — it may be stale.
  const isAdmin = profile?.role === "admin";

  const AvatarEl = userImage ? (
    <img
      src={userImage}
      alt=""
      className="h-7 w-7 rounded-full"
      referrerPolicy="no-referrer"
    />
  ) : (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
      {initial}
    </div>
  );

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="User menu"
          >
            {AvatarEl}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="min-w-[220px]">
          {/* Email header */}
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5">
              {userName ? (
                <span className="text-sm font-medium text-foreground">{userName}</span>
              ) : null}
              <span className="text-xs text-foreground-muted">{userEmail}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Storage mode */}
          <DropdownMenuItem onClick={handleStorageModeClick} className="gap-2 cursor-pointer">
            {loadingProfile ? (
              <Loader2 className="h-4 w-4 animate-spin text-foreground-muted" />
            ) : currentStorageMode === "account" ? (
              <Cloud className="h-4 w-4 text-foreground-muted" />
            ) : (
              <HardDrive className="h-4 w-4 text-foreground-muted" />
            )}
            <div className="flex flex-col">
              <span className="text-sm">Storage Mode</span>
              <span className="text-xs text-foreground-muted">
                {loadingProfile ? "Loading..." : currentStorageMode === "account" ? "Account Storage" : "Local Storage"}
              </span>
            </div>
          </DropdownMenuItem>

          {/* Export / Import Settings */}
          <DropdownMenuItem onClick={handleConfigExportClick} className="gap-2 cursor-pointer">
            <ArrowLeftRight className="h-4 w-4 text-foreground-muted" />
            <span className="text-sm">Export / Import Settings</span>
          </DropdownMenuItem>

          {/* AI Usage */}
          <DropdownMenuItem onClick={handleAiUsageClick} className="gap-2 cursor-pointer">
            <BarChart3 className="h-4 w-4 text-foreground-muted" />
            <span className="text-sm">AI Usage</span>
          </DropdownMenuItem>

          {/* Admin Panel (admin only) */}
          {isAdmin ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => { setDropdownOpen(false); router.push("/admin"); }}
                className="gap-2 cursor-pointer"
              >
                <Shield className="h-4 w-4 text-foreground-muted" />
                <span className="text-sm">Admin Panel</span>
              </DropdownMenuItem>
            </>
          ) : null}

          <DropdownMenuSeparator />

          {/* Sign out */}
          <DropdownMenuItem
            onClick={() => signOut()}
            className="gap-2 cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm">Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <StorageModeDialog
        open={storageModeDialogOpen}
        currentMode={currentStorageMode}
        onClose={() => setStorageModeDialogOpen(false)}
        onModeChanged={handleModeChanged}
      />

      <ConfigExportDialog
        open={configExportDialogOpen}
        onClose={() => setConfigExportDialogOpen(false)}
      />

      <AIUsageDialog
        open={aiUsageDialogOpen}
        onClose={() => setAiUsageDialogOpen(false)}
        usageHistory={usageHistory ?? []}
        onClearHistory={onClearUsageHistory ?? (() => {})}
      />
    </>
  );
}
