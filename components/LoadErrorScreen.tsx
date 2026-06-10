"use client";

import { CloudOff, RotateCw, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

// §10.1 — the real "Couldn't load" screen shown when error && !data, so a failed
// or slow read is never a bare infinite spinner.
export function LoadErrorScreen({
  onRetry,
  onSignOut,
  message,
}: {
  onRetry: () => void;
  onSignOut: () => void;
  message?: string;
}) {
  return (
    <main className="mx-auto flex min-h-[80dvh] max-w-md flex-col items-center justify-center px-6 text-center">
      <span className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-debit-soft text-debit">
        <CloudOff className="h-7 w-7" />
      </span>
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
        Couldn&apos;t load your house
      </h1>
      <p className="mt-2 text-[15px] text-muted">
        {message ??
          "We couldn't reach the ledger. Check your connection and try again."}
      </p>
      <div className="mt-7 flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center">
        <Button variant="gold" onClick={onRetry} className="sm:min-w-36">
          <RotateCw className="h-4 w-4" />
          Retry
        </Button>
        <Button variant="outline" onClick={onSignOut} className="sm:min-w-36">
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </main>
  );
}
