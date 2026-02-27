"use client";

import { useState, useMemo } from "react";
import { format, parse } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  value: string | null;
  onChange: (date: string | null) => void;
}

export function DatePicker({ value, onChange }: DatePickerProps) {
  const [open, setOpen] = useState(false);

  const dateValue = useMemo(() => {
    if (!value) return undefined;
    return parse(value, "yyyy-MM-dd", new Date());
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative">
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`w-full justify-start text-left font-normal bg-card-elevated ${
              !value ? "text-foreground-muted" : ""
            }`}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateValue ? format(dateValue, "dd.MM.yyyy") : "Pick a date"}
          </Button>
        </PopoverTrigger>
        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-foreground-muted hover:text-foreground-secondary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={(day) => {
            if (day) {
              onChange(format(day, "yyyy-MM-dd"));
            } else {
              onChange(null);
            }
            setOpen(false);
          }}
          defaultMonth={dateValue}
          weekStartsOn={1}
          footer={
            <div className="flex justify-between px-3 pb-3 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                Clear
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onChange(format(new Date(), "yyyy-MM-dd"));
                  setOpen(false);
                }}
              >
                Today
              </Button>
            </div>
          }
        />
      </PopoverContent>
    </Popover>
  );
}
