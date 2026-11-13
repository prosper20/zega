"use client";

import { cn } from "cn";
import { Star } from "lucide-react";

export function StarRating({
  value,
  onChange,
  size = "md",
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: "sm" | "md";
}) {
  const cls = size === "sm" ? "size-4" : "size-7";
  return (
    <fieldset className="flex gap-1" aria-label={`Rating: ${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button
            key={n}
            type="button"
            aria-pressed={value === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => onChange(n)}
          >
            <Star
              className={cn(
                cls,
                "transition-colors",
                n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40 hover:text-amber-300",
              )}
            />
          </button>
        ) : (
          <Star
            key={n}
            className={cn(cls, n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")}
          />
        ),
      )}
    </fieldset>
  );
}
