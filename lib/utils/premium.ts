import type { FsTimestamp } from "@/lib/firebase/schema";

export function isPremium(premiumUntil?: FsTimestamp | null): boolean {
  if (!premiumUntil) return false;
  return premiumUntil.seconds > Date.now() / 1000;
}
