"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardEyebrow } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { PremiumGate } from "@/components/PremiumGate";
import { CATEGORIES, CATEGORY_LIST } from "@/lib/categories";
import type { ExpenseCategory, Member, RecurringBill } from "@/lib/firebase/schema";
import { formatPHP } from "@/lib/utils/format";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

function AddBillSheet({
  open,
  onOpenChange,
  members,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  members: Member[];
}) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("other");
  const [saving, setSaving] = useState(false);

  const uids = members.map((m) => m.uid);
  const amountNum = Number.parseFloat(amount) || 0;

  function resetForm() {
    setLabel("");
    setAmount("");
    setCategory("other");
  }

  // Equal split with penny distribution to first member
  function buildSplits(): Record<string, number> {
    const n = uids.length || 1;
    const cents = Math.round(amountNum * 100);
    const base = Math.floor(cents / n);
    const rem = cents - base * n;
    return Object.fromEntries(
      uids.map((uid, i) => [uid, (base + (i === 0 ? rem : 0)) / 100]),
    );
  }

  async function save() {
    if (!label.trim()) {
      toast.error("Add a label.");
      return;
    }
    if (amountNum <= 0) {
      toast.error("Enter a positive amount.");
      return;
    }
    setSaving(true);
    try {
      await api.addRecurringBill({
        label: label.trim(),
        amount: amountNum,
        category,
        splits: buildSplits(),
      });
      toast.success("Recurring bill added");
      onOpenChange(false);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add bill");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) resetForm();
      }}
      title="Add recurring bill"
      description="Split equally among all members. Edit splits later by logging as an expense."
      footer={
        <Button
          variant="gold"
          size="lg"
          className="w-full"
          onClick={save}
          disabled={saving}
        >
          {saving ? "Adding…" : "Add bill"}
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <div>
          <Label htmlFor="bill-label">Label</Label>
          <Input
            id="bill-label"
            placeholder="e.g. Meralco, PLDT, Water bill"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="bill-amount">Amount</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-lg text-muted">
              ₱
            </span>
            <Input
              id="bill-amount"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="tnum h-14 pl-9 text-2xl font-semibold"
            />
          </div>
          {amountNum > 0 && uids.length > 0 && (
            <p className="mt-1 text-xs text-muted">
              {formatPHP(amountNum / uids.length)} each · split equally across{" "}
              {uids.length} boardmates
            </p>
          )}
        </div>
        <div>
          <Label>Category</Label>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORY_LIST.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 transition",
                  c.key === category
                    ? "border-gold bg-gold-soft/50"
                    : "border-line bg-surface hover:bg-paper-deep",
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-lg",
                    c.bg,
                    c.text,
                  )}
                >
                  <c.Icon className="h-4 w-4" />
                </span>
                <span className="text-[11px] font-medium text-ink-soft">
                  {c.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  );
}

interface RecurringBillsCardProps {
  bills: RecurringBill[];
  members: Member[];
  meUid: string;
  isPremium: boolean;
  onLogBill: (bill: RecurringBill) => void;
}

export function RecurringBillsCard({
  bills,
  members,
  meUid,
  isPremium,
  onLogBill,
}: RecurringBillsCardProps) {
  void meUid;
  const [addOpen, setAddOpen] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  async function remove(billId: string) {
    setRemoving(billId);
    try {
      await api.removeRecurringBill(billId);
      toast.success("Bill removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't remove");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardEyebrow className="mb-0">Recurring bills</CardEyebrow>
        <PremiumGate isPremium={isPremium}>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted transition hover:bg-paper-deep hover:text-ink"
            aria-label="Add recurring bill"
          >
            <Plus className="h-4 w-4" />
          </button>
        </PremiumGate>
      </div>

      {bills.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          No recurring bills yet. Add monthly bills for quick one-tap logging.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-line">
          {bills.map((bill) => {
            const meta = CATEGORIES[bill.category];
            return (
              <li key={bill.id} className="flex items-center gap-3 py-3">
                <span
                  className={cn(
                    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    meta.bg,
                    meta.text,
                  )}
                >
                  <meta.Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {bill.label}
                  </p>
                  <p className="tnum text-xs text-muted">
                    {formatPHP(bill.amount)} · monthly
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onLogBill(bill)}
                >
                  Log now
                </Button>
                <button
                  type="button"
                  onClick={() => remove(bill.id)}
                  disabled={removing === bill.id}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-debit-soft hover:text-debit disabled:opacity-50"
                  aria-label="Remove bill"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <AddBillSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        members={members}
      />
    </Card>
  );
}
