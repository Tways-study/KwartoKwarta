"use client";

import Link from "next/link";
import { CloudOff, RotateCw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export default function HouseError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[80dvh] max-w-md flex-col items-center justify-center px-6 text-center">
      <span className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-debit-soft text-debit">
        <CloudOff className="h-7 w-7" />
      </span>
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
        Something went sideways
      </h1>
      <p className="mt-2 text-[15px] text-muted">
        The ledger hit a snag. Try again, or head back to the start.
      </p>
      <div className="mt-7 flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center">
        <Button variant="gold" onClick={reset} className="sm:min-w-36">
          <RotateCw className="h-4 w-4" />
          Try again
        </Button>
        <Link
          href="/"
          className={buttonVariants({ variant: "outline" }) + " sm:min-w-36"}
        >
          Back to start
        </Link>
      </div>
    </main>
  );
}
