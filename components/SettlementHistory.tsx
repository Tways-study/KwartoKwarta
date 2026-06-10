"use client";

import { ArrowRight, HandCoins } from "lucide-react";
import { Card, CardEyebrow, CardTitle } from "@/components/ui/card";
import type { Settlement } from "@/lib/firebase/schema";
import { formatDayMonth } from "@/lib/utils/dates";
import { formatPHP } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export function SettlementHistory({
  settlements,
  meUid,
}: {
  settlements: Settlement[];
  meUid: string;
}) {
  if (settlements.length === 0) return null;

  return (
    <Card>
      <CardEyebrow>Paid back</CardEyebrow>
      <CardTitle>Settlement history</CardTitle>
      <ul className="mt-4">
        {settlements.map((s, i) => (
          <li
            key={s.id}
            className={cn("flex items-center gap-3.5 py-4", i > 0 && "tear")}
          >
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-credit-soft text-credit">
              <HandCoins className="h-4 w-4" />
            </span>
            <div className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
              <span className="font-medium text-ink">
                {s.from === meUid ? "You" : s.fromName}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-muted" />
              <span className="truncate font-medium text-ink">
                {s.to === meUid ? "you" : s.toName}
              </span>
              <span className="ml-auto pl-2 text-xs text-muted">
                {formatDayMonth(s.createdAt)}
              </span>
            </div>
            <span className="tnum shrink-0 font-semibold text-ink">
              {formatPHP(s.amount)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
