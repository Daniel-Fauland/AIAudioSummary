"use client";

import { useState, useCallback } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KeytermsListEditor } from "./KeytermsListEditor";
import type { KeytermsList } from "@/lib/types";

interface KeytermsListSelectorProps {
  lists: KeytermsList[];
  selectedListId: string | null;
  onSelectList: (id: string | null) => void;
  onSaveList: (list: KeytermsList) => void;
  onUpdateList: (list: KeytermsList) => void;
  onDeleteList: (id: string) => void;
}

export function KeytermsListSelector({
  lists,
  selectedListId,
  onSelectList,
  onSaveList,
  onUpdateList,
  onDeleteList,
}: KeytermsListSelectorProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingList, setEditingList] = useState<KeytermsList | null>(null);

  const selectedList = lists.find((l) => l.id === selectedListId);

  const handleCreate = useCallback(() => {
    setEditingList(null);
    setEditorOpen(true);
  }, []);

  const handleEdit = useCallback(() => {
    if (selectedList) {
      setEditingList(selectedList);
      setEditorOpen(true);
    }
  }, [selectedList]);

  const handleDelete = useCallback(() => {
    if (selectedListId) {
      onDeleteList(selectedListId);
      onSelectList(null);
    }
  }, [selectedListId, onDeleteList, onSelectList]);

  const handleEditorSave = useCallback(
    (list: KeytermsList) => {
      if (editingList) {
        onUpdateList(list);
      } else {
        onSaveList(list);
        onSelectList(list.id);
      }
    },
    [editingList, onSaveList, onUpdateList, onSelectList],
  );

  return (
    <>
      <div className="space-y-2">
        <div className="space-y-0.5">
          <Label className="text-sm">Keyterms Prompting</Label>
          <p className="text-xs text-foreground-muted">
            Helps transcription recognize domain-specific terms
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedListId ?? "__none__"}
            onValueChange={(v) => onSelectList(v === "__none__" ? null : v)}
          >
            <SelectTrigger className="h-8 flex-1 text-xs">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {lists.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleCreate}
            title="Create new list"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          {selectedList && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={handleEdit}
                title="Edit list"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0 text-foreground-muted hover:text-destructive"
                onClick={handleDelete}
                title="Delete list"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
        {selectedList && (
          <Badge variant="secondary" className="text-xs font-normal">
            {selectedList.terms.length} term
            {selectedList.terms.length !== 1 ? "s" : ""}
            {selectedList.terms.length > 100 && (
              <span className="ml-1 text-warning">
                (realtime: first 100 used)
              </span>
            )}
          </Badge>
        )}
      </div>

      <KeytermsListEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        list={editingList}
        onSave={handleEditorSave}
      />
    </>
  );
}
