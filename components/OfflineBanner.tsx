"use client";

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";

export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="flex items-center justify-center gap-2 bg-ink px-4 py-2 text-center text-sm font-medium text-paper">
      <WifiOff className="h-4 w-4" />
      You&apos;re offline — showing the last synced ledger.
    </div>
  );
}
