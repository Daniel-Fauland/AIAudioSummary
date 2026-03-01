"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Plus, RefreshCw, Loader2, Shield, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getUsers } from "@/lib/api";
import type { UserProfile } from "@/lib/types";
import { AddUserDialog } from "@/components/admin/AddUserDialog";
import { DeleteUserDialog } from "@/components/admin/DeleteUserDialog";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { UserMenu } from "@/components/auth/UserMenu";

function RoleBadge({ role }: { role: string }) {
  if (role === "admin") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium"
        style={{ background: "var(--primary-muted)", color: "var(--foreground-accent)" }}
      >
        <Shield className="h-3 w-3" />
        Admin
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
      style={{ background: "var(--card-elevated)", color: "var(--foreground-secondary)" }}
    >
      User
    </span>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);

  // Set page title
  useEffect(() => {
    document.title = "Admin — AI Audio Summary";
    return () => {
      document.title = "AI Audio Summary";
    };
  }, []);

  // Guard: redirect non-admins
  useEffect(() => {
    if (status === "loading") return;
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session || role !== "admin") {
      toast.error("You do not have admin access.");
      router.push("/");
    }
  }, [session, status, router]);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch {
      toast.error("Failed to load users.");
    }
  }, []);

  useEffect(() => {
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (status === "authenticated" && role === "admin") {
      setLoadingUsers(true);
      fetchUsers().finally(() => setLoadingUsers(false));
    }
  }, [status, session, fetchUsers]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  }

  function handleUserAdded(user: UserProfile) {
    setUsers((prev) => [...prev, user]);
  }

  function handleUserDeleted(id: number) {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }

  // Loading state (session or initial user fetch)
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-foreground-muted" />
      </div>
    );
  }

  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== "admin") {
    // Will redirect via useEffect — show nothing
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6">
        <Logo />
        <div className="flex items-center gap-2">
          <UserMenu />
          <ThemeToggle />
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        {/* Back link + page title */}
        <div className="mb-6">
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-foreground-secondary hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to App
          </Link>
          <div className="flex items-center gap-2 mt-2">
            <Users className="h-5 w-5 text-foreground-secondary" />
            <h1 className="text-xl font-semibold text-foreground">Admin Panel</h1>
          </div>
          <p className="mt-1 text-sm text-foreground-muted">Manage user access to the application.</p>
        </div>

        {/* Card */}
        <div className="rounded-lg border border-border bg-card p-6">
          {/* Table header actions */}
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-foreground-secondary">
              {loadingUsers ? "" : `${users.length} user${users.length !== 1 ? "s" : ""}`}
            </span>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRefresh}
                    disabled={loadingUsers || refreshing}
                    className="text-foreground-secondary hover:text-foreground"
                    aria-label="Refresh user list"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh</TooltipContent>
              </Tooltip>
              <Button onClick={() => setAddDialogOpen(true)} size="sm">
                <Plus className="mr-1.5 h-4 w-4" />
                Add User
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-3 text-left font-medium text-foreground-secondary">Email</th>
                  <th className="hidden pb-3 text-left font-medium text-foreground-secondary md:table-cell">Name</th>
                  <th className="pb-3 text-left font-medium text-foreground-secondary">Role</th>
                  <th className="hidden pb-3 text-left font-medium text-foreground-secondary lg:table-cell">Account Storage</th>
                  <th className="hidden pb-3 text-left font-medium text-foreground-secondary sm:table-cell">Joined</th>
                  <th className="hidden pb-3 text-left font-medium text-foreground-secondary lg:table-cell">Last Visit</th>
                  <th className="pb-3 text-right font-medium text-foreground-secondary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingUsers ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="py-3 pr-4"><Skeleton className="h-4 w-40" /></td>
                      <td className="hidden py-3 pr-4 md:table-cell"><Skeleton className="h-4 w-24" /></td>
                      <td className="py-3 pr-4"><Skeleton className="h-5 w-14 rounded-md" /></td>
                      <td className="hidden py-3 pr-4 lg:table-cell"><Skeleton className="h-4 w-12" /></td>
                      <td className="hidden py-3 pr-4 sm:table-cell"><Skeleton className="h-4 w-20" /></td>
                      <td className="hidden py-3 pr-4 lg:table-cell"><Skeleton className="h-4 w-28" /></td>
                      <td className="py-3 text-right"><Skeleton className="ml-auto h-7 w-16 rounded-md" /></td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-foreground-muted">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-b border-border last:border-0">
                      <td className="py-3 pr-4 text-foreground">{user.email}</td>
                      <td className="hidden py-3 pr-4 text-foreground-secondary md:table-cell">
                        {user.name ?? "—"}
                      </td>
                      <td className="py-3 pr-4">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="hidden py-3 pr-4 lg:table-cell">
                        {user.storage_mode === "account" ? (
                          <span className="text-green-500 font-medium text-xs">True</span>
                        ) : (
                          <span className="text-foreground-muted text-xs">False</span>
                        )}
                      </td>
                      <td className="hidden py-3 pr-4 text-foreground-muted sm:table-cell">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="hidden py-3 pr-4 text-foreground-muted lg:table-cell">
                        {user.last_visit_at ? formatDateTime(user.last_visit_at) : ""}
                      </td>
                      <td className="py-3 text-right">
                        {user.role !== "admin" && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteTarget(user)}
                          >
                            Delete
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <AddUserDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onUserAdded={handleUserAdded}
      />
      <DeleteUserDialog
        user={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onUserDeleted={handleUserDeleted}
      />
    </div>
  );
}
