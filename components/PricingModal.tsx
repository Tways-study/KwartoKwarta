"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Check, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FREE_FEATURES = [
  "Live balance tracking",
  "Shared expense ledger",
  "Simplified settlements",
  "Up to 10 boardmates",
  "Offline access",
];

const PREMIUM_FEATURES = [
  "Everything in Free",
  "Monthly budget tracker",
  "Recurring bills list",
  "AI receipt scan",
  "CSV expense export",
];

export function PricingModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-medium text-gold-deep underline-offset-4 transition hover:underline"
      >
        See pricing →
      </button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-[2px] transition-opacity duration-300 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
          <Dialog.Popup
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 w-full sm:inset-0 sm:m-auto sm:h-fit sm:max-w-2xl",
              "max-h-[92dvh] overflow-y-auto border border-line bg-surface shadow-lift",
              "rounded-t-3xl sm:rounded-3xl",
              "transition duration-300 ease-out",
              "data-[starting-style]:translate-y-5 data-[starting-style]:opacity-0",
              "data-[ending-style]:translate-y-5 data-[ending-style]:opacity-0",
            )}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-start gap-3 rounded-t-3xl bg-surface/95 px-5 pb-3 pt-5 backdrop-blur sm:px-7">
              <div className="min-w-0 flex-1">
                <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line-strong sm:hidden" />
                <Dialog.Title className="font-display text-xl font-semibold tracking-tight text-ink">
                  Simple pricing
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-muted">
                  Start free. Upgrade when you want more.
                </Dialog.Description>
              </div>
              <Dialog.Close
                className="-mr-1 mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-paper-deep hover:text-ink"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </Dialog.Close>
            </div>

            {/* Plan cards */}
            <div className="grid gap-4 px-5 pb-6 sm:grid-cols-2 sm:px-7 sm:pb-8">
              {/* Free */}
              <div className="flex flex-col gap-5 rounded-2xl border border-line bg-paper p-5 sm:p-6">
                <div>
                  <p className="text-sm font-medium text-muted">Free</p>
                  <p className="tnum mt-1 font-display text-4xl font-semibold tracking-tight text-ink">
                    ₱0
                    <span className="font-sans text-base font-normal text-muted">
                      /mo
                    </span>
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    Everything you need to split bills and settle up.
                  </p>
                </div>
                <ul className="flex flex-col gap-2.5">
                  {FREE_FEATURES.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-ink-soft">
                      <Check className="h-4 w-4 shrink-0 text-credit" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth"
                  onClick={() => setOpen(false)}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "mt-auto w-full justify-center",
                  )}
                >
                  Get started free
                </Link>
              </div>

              {/* Premium */}
              <div className="relative flex flex-col gap-5 rounded-2xl border border-gold bg-ink p-5 text-paper sm:p-6">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold-deep px-3 py-0.5 text-xs font-semibold text-white shadow">
                    <Sparkles className="h-3 w-3" />
                    Popular
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-paper/60">Premium</p>
                  <p className="tnum mt-1 font-display text-4xl font-semibold tracking-tight text-paper">
                    ₱100
                    <span className="font-sans text-base font-normal text-paper/60">
                      /mo
                    </span>
                  </p>
                  <p className="mt-2 text-sm text-paper/60">
                    Unlock budgeting, AI receipts, and more.
                  </p>
                </div>
                <ul className="flex flex-col gap-2.5">
                  {PREMIUM_FEATURES.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-paper/80">
                      <Check className="h-4 w-4 shrink-0 text-gold" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth"
                  onClick={() => setOpen(false)}
                  className={cn(
                    buttonVariants({ variant: "gold", size: "lg" }),
                    "mt-auto w-full justify-center",
                  )}
                >
                  Start with Premium
                </Link>
              </div>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
