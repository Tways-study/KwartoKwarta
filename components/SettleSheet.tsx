"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { Avatar } from "@/components/ui/avatar";
import type { Member } from "@/lib/firebase/schema";
import { simplifyDebts } from "@/lib/utils/balances";
import { formatPHP } from "@/lib/utils/format";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export function SettleSheet({
  open,
  onOpenChange,
  members,
  meUid,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  meUid: string;
}) {
  const transfers = useMemo(() => simplifyDebts(members), [members]);
  const myPayments = transfers.filter((t) => t.fromUid === meUid);
  const myIncoming = transfers.filter((t) => t.toUid === meUid);
  const others = members.filter((m) => m.uid !== meUid);

  const [payingId, setPayingId] = useState<string | null>(null);
  const [manualTo, setManualTo] = useState(others[0]?.uid ?? "");
  const [manualAmount, setManualAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function record(toUid: string, amount: number, tag: string) {
    setPayingId(tag);
    try {
      await api.addSettlement({ toUid, amount });
      toast.success("Settlement recorded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't record that");
    } finally {
      setPayingId(null);
    }
  }

  async function submitManual() {
    const amount = Number.parseFloat(manualAmount) || 0;
    if (!manualTo) return toast.error("Choose who you're paying.");
    if (amount <= 0) return toast.error("Enter an amount greater than 0.");
    setSubmitting(true);
    try {
      await api.addSettlement({ toUid: manualTo, amount });
      toast.success("Settlement recorded");
      setManualAmount("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't record that");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Settle up"
      description="The fewest payments to square everyone away."
    >
      <div className="flex flex-col gap-6">
        {myPayments.length > 0 && (
          <section>
            <Label>You should pay</Label>
            <div className="flex flex-col gap-2">
              {myPayments.map((t) => {
                const tag = `pay-${t.toUid}`;
                return (
                  <div
                    key={t.toUid}
                    className="flex items-center gap-3 rounded-xl border border-line bg-surface p-2.5"
                  >
                    <Avatar name={t.toName} size={34} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">
                        {t.toName}
                      </p>
                      <p className="tnum text-xs text-debit">
                        you owe {formatPHP(t.amount)}
                      </p>
                    </div>
                    <Button
                      variant="gold"
                      size="sm"
                      disabled={payingId === tag}
                      onClick={() => record(t.toUid, t.amount, tag)}
                    >
                      <Check className="h-4 w-4" />
                      Mark paid
                    </Button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {myIncoming.length > 0 && (
          <section>
            <Label>Coming your way</Label>
            <div className="flex flex-col gap-1.5">
              {myIncoming.map((t) => (
                <div
                  key={t.fromUid}
                  className="flex items-center gap-2 text-sm text-ink-soft"
                >
                  <Avatar name={t.fromName} size={26} />
                  <span className="font-medium text-ink">{t.fromName}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted" />
                  <span className="text-muted">you</span>
                  <span className="tnum ml-auto font-semibold text-credit">
                    {formatPHP(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {transfers.length === 0 && (
          <p className="rounded-xl bg-credit-soft px-4 py-3 text-center text-sm font-medium text-credit">
            Everyone&apos;s squared up. Nothing to settle. 🎉
          </p>
        )}

        <section className="tear pt-5">
          <Label>Record a payment manually</Label>
          <div className="flex flex-wrap gap-1.5">
            {others.map((m) => (
              <button
                key={m.uid}
                type="button"
                onClick={() => setManualTo(m.uid)}
                className={cn(
                  "flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition",
                  manualTo === m.uid
                    ? "border-gold bg-gold-soft/50 text-ink"
                    : "border-line bg-surface text-ink-soft hover:bg-paper-deep",
                )}
              >
                <Avatar name={m.displayName} photoURL={m.photoURL} size={24} />
                {m.displayName.split(" ")[0]}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-muted">
                ₱
              </span>
              <Input
                inputMode="decimal"
                placeholder="0.00"
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                className="tnum pl-8"
              />
            </div>
            <Button onClick={submitManual} disabled={submitting}>
              {submitting ? "Saving…" : "Record"}
            </Button>
          </div>
        </section>
      </div>
    </Sheet>
  );
}
