"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { PremiumGate } from "@/components/PremiumGate";
import type { Expense, Member } from "@/lib/firebase/schema";
import { toDate } from "@/lib/utils/dates";

interface ReportExportButtonProps {
  expenses: Expense[];
  members: Member[];
  meUid: string;
  isPremium: boolean;
  houseName: string;
}

function buildCsv(
  expenses: Expense[],
  members: Member[],
  meUid: string,
): string {
  const nameMap = Object.fromEntries(members.map((m) => [m.uid, m.displayName]));
  const sorted = [...expenses].sort((a, b) => a.date.seconds - b.date.seconds);
  const rows: string[][] = [
    ["Date", "Description", "Category", "Amount", "Paid By", "My Share"],
  ];
  for (const e of sorted) {
    const d = toDate(e.date);
    rows.push([
      d ? format(d, "yyyy-MM-dd") : "",
      e.description,
      e.category,
      e.amount.toFixed(2),
      nameMap[e.paidBy] ?? e.paidByName,
      (e.splits[meUid] ?? 0).toFixed(2),
    ]);
  }
  return rows
    .map((r) =>
      r
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");
}

export function ReportExportButton({
  expenses,
  members,
  meUid,
  isPremium,
  houseName,
}: ReportExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  function doExport() {
    if (expenses.length === 0) {
      toast.error("No expenses to export yet.");
      return;
    }
    setExporting(true);
    try {
      const csv = buildCsv(expenses, members, meUid);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const slug = houseName
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      a.href = url;
      a.download = `kwartokwarta-${slug}-${format(new Date(), "yyyy-MM")}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("CSV downloaded");
    } catch {
      toast.error("Export failed — try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <PremiumGate isPremium={isPremium}>
      <button
        type="button"
        onClick={doExport}
        disabled={exporting}
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-muted transition hover:bg-paper-deep hover:text-ink disabled:opacity-50"
      >
        <Download className="h-3.5 w-3.5" />
        {exporting ? "Exporting…" : "Export CSV"}
      </button>
    </PremiumGate>
  );
}
