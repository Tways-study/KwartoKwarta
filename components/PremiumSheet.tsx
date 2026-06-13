"use client";

import { useState } from "react";
import { Camera, FileDown, RefreshCw, Sparkles, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

const BENEFITS = [
  {
    Icon: Wallet,
    title: "Monthly budget",
    desc: "Set a house budget and track spending against it in real time.",
  },
  {
    Icon: RefreshCw,
    title: "Recurring bills",
    desc: "Keep a reference list of monthly bills and log them in one tap.",
  },
  {
    Icon: Camera,
    title: "Receipt scan",
    desc: "Snap a receipt and let AI fill in the amount, category, and date.",
  },
  {
    Icon: FileDown,
    title: "Export CSV",
    desc: "Download your house's full expense history as a spreadsheet.",
  },
];

interface PremiumSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PremiumSheet({ open, onOpenChange }: PremiumSheetProps) {
  const [busy, setBusy] = useState(false);

  async function subscribe() {
    setBusy(true);
    try {
      await api.subscribe();
      toast.success("Premium activated — enjoy 30 days free!");
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't activate premium",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="KwartoKwarta Premium"
      description="Unlock the full ledger experience."
      footer={
        <Button
          variant="gold"
          size="lg"
          className="w-full"
          onClick={subscribe}
          disabled={busy}
        >
          <Sparkles className="h-4 w-4" />
          {busy ? "Activating…" : "Try 30 days free"}
        </Button>
      }
    >
      <div className="flex flex-col gap-5 py-2">
        {BENEFITS.map(({ Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-4">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-soft/60">
              <Icon className="h-5 w-5 text-gold-deep" />
            </span>
            <div>
              <p className="font-medium text-ink">{title}</p>
              <p className="mt-0.5 text-sm text-muted">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
