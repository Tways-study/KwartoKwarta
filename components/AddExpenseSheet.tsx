"use client";

import { useRef, useMemo, useState } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { Avatar } from "@/components/ui/avatar";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { PremiumSheet } from "@/components/PremiumSheet";
import { CATEGORY_LIST } from "@/lib/categories";
import type { ExpenseCategory, Member, SplitType } from "@/lib/firebase/schema";
import { createExpenseSchema } from "@/lib/schemas/expense";
import { toDateInputValue } from "@/lib/utils/dates";
import { formatPHP } from "@/lib/utils/format";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export interface ExpensePrefill {
  description?: string;
  amount?: string;
  category?: ExpenseCategory;
  splitType?: SplitType;
  splits?: Record<string, string>; // uid -> string value for custom inputs
}

function equalSplits(amount: number, uids: string[]): Record<string, number> {
  const n = uids.length || 1;
  const cents = Math.round(amount * 100);
  const base = Math.floor(cents / n);
  const rem = cents - base * n;
  const out: Record<string, number> = {};
  uids.forEach((uid, i) => {
    out[uid] = (base + (i < rem ? 1 : 0)) / 100;
  });
  return out;
}

export function AddExpenseSheet({
  open,
  onOpenChange,
  members,
  meUid,
  isPremium,
  prefill,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  meUid: string;
  isPremium: boolean;
  prefill?: ExpensePrefill | null;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("grocery");
  const [paidBy, setPaidBy] = useState(meUid);
  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uids = useMemo(() => members.map((m) => m.uid), [members]);

  // Reset (or apply prefill) each time the sheet opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDescription(prefill?.description ?? "");
      setAmount(prefill?.amount ?? "");
      setCategory(prefill?.category ?? "grocery");
      setSplitType(prefill?.splitType ?? "equal");
      setCustom(prefill?.splits ?? {});
      setPaidBy(meUid);
      setDate(toDateInputValue(new Date()));
    }
  }

  const amountNum = Number.parseFloat(amount) || 0;
  const customSum = uids.reduce(
    (sum, uid) => sum + (Number.parseFloat(custom[uid] ?? "") || 0),
    0,
  );
  const customBalanced = Math.abs(customSum - amountNum) < 0.01;

  const splits =
    splitType === "equal"
      ? equalSplits(amountNum, uids)
      : Object.fromEntries(
          uids.map((uid) => [uid, Number.parseFloat(custom[uid] ?? "") || 0]),
        );

  async function submit() {
    const parsed = createExpenseSchema.safeParse({
      description,
      amount: amountNum,
      paidBy,
      category,
      splitType,
      splits,
      date,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the form.");
      return;
    }
    if (splitType === "custom" && !customBalanced) {
      toast.error("Custom splits must add up to the total.");
      return;
    }
    setSubmitting(true);
    try {
      await api.addExpense(parsed.data);
      toast.success("Expense added");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add expense");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleScanFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // reset so the same file can be picked again
    setScanning(true);
    try {
      const result = await api.scanReceipt(file);
      if (result.description) setDescription(result.description);
      if (result.amount) setAmount(result.amount.toString());
      if (result.category) setCategory(result.category);
      if (result.date) setDate(result.date);
      toast.success("Receipt scanned — review the details below.");
    } catch {
      toast.error("Couldn't read the receipt — fill it in manually.");
    } finally {
      setScanning(false);
    }
  }

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        title="Add an expense"
        description="Log a shared cost and we'll update everyone's balance."
        footer={
          <Button
            variant="gold"
            size="lg"
            className="w-full"
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? "Adding…" : `Add ${formatPHP(amountNum)}`}
          </Button>
        }
      >
      <div className="flex flex-col gap-6">
        <div>
          <Label htmlFor="amount">Amount</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-lg text-muted">
              ₱
            </span>
            <Input
              id="amount"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="tnum h-14 pl-9 text-2xl font-semibold"
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <Label htmlFor="description" className="mb-0">
              What for?
            </Label>
            <button
              type="button"
              onClick={() => {
                if (!isPremium) {
                  setPremiumOpen(true);
                  return;
                }
                fileInputRef.current?.click();
              }}
              disabled={scanning}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted transition hover:bg-paper-deep hover:text-ink disabled:opacity-50"
              aria-label="Scan receipt"
            >
              {scanning ? (
                <Spinner size={12} />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
              {scanning ? "Scanning…" : "Scan receipt"}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleScanFile}
          />
          <Input
            id="description"
            placeholder="e.g. Meralco bill, palengke run"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <Label>Category</Label>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORY_LIST.map((c) => {
              const active = c.key === category;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategory(c.key)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 transition",
                    active
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
              );
            })}
          </div>
        </div>

        <div>
          <Label>Paid by</Label>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => {
              const active = m.uid === paidBy;
              return (
                <button
                  key={m.uid}
                  type="button"
                  onClick={() => setPaidBy(m.uid)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition",
                    active
                      ? "border-gold bg-gold-soft/50 text-ink"
                      : "border-line bg-surface text-ink-soft hover:bg-paper-deep",
                  )}
                >
                  <Avatar name={m.displayName} photoURL={m.photoURL} size={26} />
                  {m.uid === meUid ? "You" : m.displayName.split(" ")[0]}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label className="mb-0">Split</Label>
            <Segmented
              value={splitType}
              onChange={(v) => setSplitType(v)}
              options={[
                { value: "equal", label: "Equal" },
                { value: "custom", label: "Custom" },
              ]}
            />
          </div>

          {splitType === "equal" ? (
            <p className="text-sm text-muted">
              Split evenly —{" "}
              <span className="tnum font-medium text-ink-soft">
                {formatPHP(amountNum / (uids.length || 1))}
              </span>{" "}
              each across {uids.length}{" "}
              {uids.length === 1 ? "boardmate" : "boardmates"}.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {members.map((m) => (
                <div key={m.uid} className="flex items-center gap-3">
                  <Avatar
                    name={m.displayName}
                    photoURL={m.photoURL}
                    size={28}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">
                    {m.uid === meUid ? "You" : m.displayName}
                  </span>
                  <div className="relative w-28">
                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-sm text-muted">
                      ₱
                    </span>
                    <Input
                      inputMode="decimal"
                      placeholder="0.00"
                      value={custom[m.uid] ?? ""}
                      onChange={(e) =>
                        setCustom((prev) => ({
                          ...prev,
                          [m.uid]: e.target.value,
                        }))
                      }
                      className="tnum h-10 pl-6 text-right"
                    />
                  </div>
                </div>
              ))}
              <div
                className={cn(
                  "tear mt-1 flex items-center justify-between pt-2 text-sm",
                  customBalanced ? "text-credit" : "text-debit",
                )}
              >
                <span>{customBalanced ? "Balanced" : "Doesn't add up"}</span>
                <span className="tnum font-medium">
                  {formatPHP(customSum)} / {formatPHP(amountNum)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Sheet>

      <PremiumSheet open={premiumOpen} onOpenChange={setPremiumOpen} />
    </>
  );
}
