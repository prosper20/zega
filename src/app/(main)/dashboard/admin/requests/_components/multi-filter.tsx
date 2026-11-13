"use client";

import { cn } from "cn";
import { Check, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** Compact multi-select filter (popover of checkable options). */
export function MultiFilter({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("h-9 border-dashed", value.length && "border-solid")}>
          {label}
          {value.length > 0 && (
            <span className="bg-primary text-primary-foreground rounded px-1.5 text-[11px] tabular-nums">
              {value.length}
            </span>
          )}
          <ChevronDown data-icon="inline-end" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1" align="start">
        {options.map((o) => {
          const on = value.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(o.value)}
              className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
            >
              <span
                className={cn(
                  "flex size-4 items-center justify-center rounded border",
                  on && "border-primary bg-primary text-primary-foreground",
                )}
              >
                {on && <Check className="size-3" strokeWidth={3} />}
              </span>
              {o.label}
            </button>
          );
        })}
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-muted-foreground hover:text-foreground mt-1 w-full border-t px-2 py-1.5 text-left text-xs"
          >
            Clear
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
