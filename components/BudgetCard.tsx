"use client";

import { useState } from "react";
import { isSameMonth } from "date-fns";
import { toast } from "sonner";
import { Card, CardEyebrow } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { PremiumGate } from "@/components/PremiumGate";
import type { Expense } from "@/lib/firebase/schema";
import { toDate, monthLabel } from "@/lib/utils/dates";
import { formatPHP } from "@/lib/utils/format";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface BudgetCardProps {
  expenses: Expense[];
  budget: number | undefined;
  isPremium: boolean;
}

export function BudgetCard({ expenses, budget, isPremium }: BudgetCardProps) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const spent = expenses
    .filter((e) => {
      const d = toDate(e.date);
      return d ? isSameMonth(d, now) : false;
    })
    .reduce((sum, e) => sum + e.amount, 0);

  const pct = budget && budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const over = budget != null && spent > budget;
  const barColor = over ? "bg-debit" : pct >= 75 ? "bg-gold" : "bg-credit";

  async function save() {
    const n = Number.parseFloat(input);
    if (Number.isNaN(n) || n < 0) {
      toast.error("Enter a valid amount (or 0 to clear).");
      return;
    }
    setSaving(true);
    try {
      await api.setBudget(n);
      setEditing(false);
      toast.success(n === 0 ? "Budget cleared" : "Budget updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save budget");
    } finally {
      setSaving(false);
    }
  }

  const EditUI = (
    <div className="mt-5">
      {editing ? (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-muted">
              ₱
            </span>
            <Input
              inputMode="decimal"
              placeholder="0.00"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="tnum pl-7"
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
          </div>
          <Button variant="gold" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button variant="outline" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setInput(budget?.toString() ?? "");
            setEditing(true);
          }}
        >
          {budget ? "Edit budget" : "Set budget"}
        </Button>
      )}
    </div>
  );

  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <CardEyebrow className="mb-0">Budget · {monthLabel(now)}</CardEyebrow>
        {over && (
          <span className="text-xs font-medium text-debit">Over budget</span>
        )}
      </div>

      {budget ? (
        <>
          <div className="mt-4">
            <div className="flex items-baseline justify-between text-sm">
              <span className="tnum text-ink">{formatPHP(spent)} spent</span>
              <span className="tnum text-muted">of {formatPHP(budget)}</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-paper-deep">
              <div
                className={cn("h-full rounded-full transition-all", barColor)}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <PremiumGate isPremium={isPremium}>{EditUI}</PremiumGate>
        </>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-muted">
            No budget set. Track monthly spending against a limit.
          </p>
          <PremiumGate isPremium={isPremium}>{EditUI}</PremiumGate>
        </div>
      )}
    </Card>
  );
}
