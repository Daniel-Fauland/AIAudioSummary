"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { deleteUser, ApiError } from "@/lib/api";
import type { UserProfile } from "@/lib/types";

interface DeleteUserDialogProps {
  user: UserProfile | null;
  onClose: () => void;
  onUserDeleted: (id: number) => void;
}

export function DeleteUserDialog({ user, onClose, onUserDeleted }: DeleteUserDialogProps) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!user) return;
    setLoading(true);
    try {
      await deleteUser(user.id);
      toast.success(`User ${user.email} removed.`);
      onUserDeleted(user.id);
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        toast.error("Admin users cannot be deleted.");
      } else {
        toast.error("Failed to delete user. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && !loading && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove access for{" "}
            <span className="font-medium text-foreground">{user?.email}</span>?{" "}
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
