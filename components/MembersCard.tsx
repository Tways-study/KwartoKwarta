"use client";

import { Card, CardEyebrow, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import type { Member } from "@/lib/firebase/schema";
import { formatSignedPHP, formatPHP } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export function MembersCard({
  members,
  meUid,
}: {
  members: Member[];
  meUid: string;
}) {
  const sorted = [...members].sort((a, b) => b.balance - a.balance);

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <CardEyebrow className="mb-0.5">Boardmates</CardEyebrow>
          <CardTitle>{members.length} in the house</CardTitle>
        </div>
      </div>

      <ul className="mt-5 flex flex-col">
        {sorted.map((m, i) => {
          const settled = Math.abs(m.balance) < 0.01;
          return (
            <li
              key={m.uid}
              className={cn(
                "flex items-center gap-3.5 py-4",
                i > 0 && "tear",
              )}
            >
              <Avatar name={m.displayName} photoURL={m.photoURL} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">
                  {m.displayName}
                  {m.uid === meUid && (
                    <span className="ml-1.5 text-xs font-normal text-muted">
                      (you)
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted">
                  {settled
                    ? "All settled up"
                    : m.balance > 0
                      ? "is owed"
                      : "owes the house"}
                </p>
              </div>
              <span
                className={cn(
                  "tnum shrink-0 text-right text-[15px] font-semibold",
                  settled
                    ? "text-muted"
                    : m.balance > 0
                      ? "text-credit"
                      : "text-debit",
                )}
              >
                {settled ? formatPHP(0) : formatSignedPHP(m.balance)}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
