"use client";

import { useState, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { PremiumSheet } from "@/components/PremiumSheet";

interface PremiumGateProps {
  isPremium: boolean;
  children: ReactNode;
}

export function PremiumGate({ isPremium, children }: PremiumGateProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  if (isPremium) return <>{children}</>;

  return (
    <>
      <div className="relative">
        <div className="pointer-events-none select-none opacity-40">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-ink/90 px-4 py-2 text-sm font-medium text-paper shadow-lift backdrop-blur-sm transition hover:bg-ink"
          >
            <Lock className="h-3.5 w-3.5" />
            Go Premium
          </button>
        </div>
      </div>
      <PremiumSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}
