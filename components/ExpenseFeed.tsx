"use client";

import { Receipt } from "lucide-react";
import { Card, CardEyebrow, CardTitle } from "@/components/ui/card";
import { CATEGORIES } from "@/lib/categories";
import type { Expense } from "@/lib/firebase/schema";
import { formatDayMonth } from "@/lib/utils/dates";
import { formatPHP } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export function ExpenseFeed({
  expenses,
  meUid,
}: {
  expenses: Expense[];
  meUid: string;
}) {
  return (
    <Card>
      <CardEyebrow>The ledger</CardEyebrow>
      <CardTitle>Recent expenses</CardTitle>

      {expenses.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 py-8 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-paper-deep text-muted">
            <Receipt className="h-5 w-5" />
          </span>
          <p className="text-sm text-muted">
            Nothing logged yet. Add your first shared expense.
          </p>
        </div>
      ) : (
        <ul className="mt-4">
          {expenses.map((e, i) => {
            const meta = CATEGORIES[e.category];
            const myShare = e.splits[meUid] ?? 0;
            const iPaid = e.paidBy === meUid;
            return (
              <li
                key={e.id}
                className={cn("flex items-center gap-3.5 py-4", i > 0 && "tear")}
              >
                <span
                  className={cn(
                    "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                    meta.bg,
                    meta.text,
                  )}
                >
                  <meta.Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">
                    {e.description}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {iPaid ? "You" : e.paidByName} paid ·{" "}
                    {formatDayMonth(e.date)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tnum font-semibold text-ink">
                    {formatPHP(e.amount)}
                  </p>
                  <p
                    className={cn(
                      "tnum text-xs",
                      iPaid ? "text-credit" : "text-muted",
                    )}
                  >
                    {iPaid
                      ? `you're owed ${formatPHP(e.amount - myShare)}`
                      : `your share ${formatPHP(myShare)}`}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
