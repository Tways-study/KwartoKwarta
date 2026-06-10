"use client";

import {
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  startOfMonth,
} from "date-fns";
import { Card, CardEyebrow, CardTitle } from "@/components/ui/card";
import type { Expense } from "@/lib/firebase/schema";
import { toDate, monthLabel } from "@/lib/utils/dates";
import { formatPHP } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function ExpenseCalendar({ expenses }: { expenses: Expense[] }) {
  const now = new Date();
  const start = startOfMonth(now);
  const days = eachDayOfInterval({ start, end: endOfMonth(now) });
  const leadingBlanks = getDay(start); // 0 = Sunday

  // Sum spend per day for the current month.
  const perDay = new Map<string, number>();
  for (const e of expenses) {
    const d = toDate(e.date);
    if (!d || !isSameMonth(d, now)) continue;
    const key = format(d, "yyyy-MM-dd");
    perDay.set(key, (perDay.get(key) ?? 0) + e.amount);
  }
  const max = Math.max(1, ...perDay.values());

  return (
    <Card>
      <CardEyebrow>{monthLabel(now)}</CardEyebrow>
      <CardTitle>Spend calendar</CardTitle>

      <div className="mt-5 grid grid-cols-7 gap-2">
        {WEEKDAYS.map((w, i) => (
          <div
            key={i}
            className="pb-1 text-center text-[11px] font-medium text-muted"
          >
            {w}
          </div>
        ))}
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const amt = perDay.get(key) ?? 0;
          const intensity = amt > 0 ? 0.18 + (amt / max) * 0.82 : 0;
          const today = isSameDay(day, now);
          return (
            <div
              key={key}
              title={amt > 0 ? `${format(day, "MMM d")} · ${formatPHP(amt)}` : format(day, "MMM d")}
              className={cn(
                "relative flex aspect-square items-center justify-center rounded-lg text-xs",
                amt > 0 ? "text-ink" : "text-muted",
                today && "ring-1 ring-gold-deep ring-offset-1 ring-offset-surface",
              )}
              style={
                amt > 0
                  ? {
                      backgroundColor: `color-mix(in oklab, var(--color-gold) ${Math.round(intensity * 100)}%, var(--color-paper-deep))`,
                    }
                  : { backgroundColor: "var(--color-paper-deep)" }
              }
            >
              {format(day, "d")}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
