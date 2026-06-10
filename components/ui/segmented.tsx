"use client";

import { cn } from "@/lib/utils";

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: SegmentedProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex rounded-xl border border-line-strong bg-paper-deep p-1",
        className,
      )}
      role="tablist"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all duration-200",
              active
                ? "bg-surface text-ink shadow-[0_1px_2px_rgba(33,28,22,0.12)]"
                : "text-muted hover:text-ink-soft",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
