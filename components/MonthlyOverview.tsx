"use client";

import { isSameMonth } from "date-fns";
import { Card, CardEyebrow } from "@/components/ui/card";
import { CATEGORIES } from "@/lib/categories";
import type { Expense, ExpenseCategory } from "@/lib/firebase/schema";
import { toDate, monthLabel } from "@/lib/utils/dates";
import { formatPHP } from "@/lib/utils/format";

export function MonthlyOverview({
  expenses,
  meUid,
}: {
  expenses: Expense[];
  meUid: string;
}) {
  const now = new Date();
  const thisMonth = expenses.filter((e) => {
    const d = toDate(e.date);
    return d ? isSameMonth(d, now) : false;
  });

  const total = thisMonth.reduce((sum, e) => sum + e.amount, 0);
  const myShare = thisMonth.reduce((sum, e) => sum + (e.splits[meUid] ?? 0), 0);

  const byCategory = new Map<ExpenseCategory, number>();
  for (const e of thisMonth) {
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
  }
  const segments = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <CardEyebrow className="mb-0">{monthLabel(now)}</CardEyebrow>
        <span className="text-sm text-muted">
          {thisMonth.length} {thisMonth.length === 1 ? "expense" : "expenses"}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">House spent</p>
          <p className="tnum font-display text-[2.8rem] leading-none font-semibold tracking-tight text-ink">
            {formatPHP(total)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted">Your share</p>
          <p className="tnum font-display text-[1.5rem] font-semibold text-ink-soft">
            {formatPHP(myShare)}
          </p>
        </div>
      </div>

      {segments.length > 0 ? (
        <div className="mt-7">
          <div className="flex h-3 overflow-hidden rounded-full bg-paper-deep">
            {segments.map(([cat, amt]) => (
              <span
                key={cat}
                className={CATEGORIES[cat].dot}
                style={{ width: `${(amt / total) * 100}%` }}
                title={`${CATEGORIES[cat].label} · ${formatPHP(amt)}`}
              />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
            {segments.slice(0, 4).map(([cat, amt]) => (
              <span
                key={cat}
                className="inline-flex items-center gap-1.5 text-xs text-ink-soft"
              >
                <span
                  className={`h-2 w-2 rounded-full ${CATEGORIES[cat].dot}`}
                />
                {CATEGORIES[cat].label}
                <span className="tnum text-muted">{formatPHP(amt)}</span>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-5 text-sm text-muted">
          No expenses logged this month yet.
        </p>
      )}
    </Card>
  );
}
