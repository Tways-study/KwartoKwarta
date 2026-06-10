import { Spinner } from "@/components/ui/spinner";

export default function HouseLoading() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3">
      <Spinner size={28} />
      <p className="text-sm text-muted">Loading your ledger…</p>
    </main>
  );
}
