"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  Copy,
  HandCoins,
  Home,
  LogOut,
  Plus,
  Settings,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useActiveHouse } from "@/lib/hooks/useActiveHouse";
import {
  useExpenses,
  useHouse,
  useMembers,
  useRecurringBills,
  useSettlements,
  useUserDoc,
} from "@/lib/hooks/firestore";
import { isPremium as isPremiumFn } from "@/lib/utils/premium";
import { Wordmark } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { OfflineBanner } from "@/components/OfflineBanner";
import { LoadErrorScreen } from "@/components/LoadErrorScreen";
import { MonthlyOverview } from "@/components/MonthlyOverview";
import { BudgetCard } from "@/components/BudgetCard";
import { MembersCard } from "@/components/MembersCard";
import { ExpenseFeed } from "@/components/ExpenseFeed";
import { ExpenseCalendar } from "@/components/ExpenseCalendar";
import { SettlementHistory } from "@/components/SettlementHistory";
import { RecurringBillsCard } from "@/components/RecurringBillsCard";
import { ReportExportButton } from "@/components/ReportExportButton";
import { AddExpenseSheet, type ExpensePrefill } from "@/components/AddExpenseSheet";
import { SettleSheet } from "@/components/SettleSheet";
import type { RecurringBill } from "@/lib/firebase/schema";
import { formatPHP } from "@/lib/utils/format";

function CenteredSpinner() {
  return (
    <main className="flex min-h-dvh items-center justify-center">
      <Spinner size={28} />
    </main>
  );
}

function DashboardSkeleton() {
  return (
    <main className="mx-auto max-w-6xl px-5 sm:px-8 py-8">
      <div className="h-12 w-40 animate-pulse rounded-2xl bg-paper-deep" />
      <div className="mt-8 h-52 animate-pulse rounded-[1.25rem] bg-paper-deep" />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-[1.25rem] bg-paper-deep" />
        <div className="h-64 animate-pulse rounded-[1.25rem] bg-paper-deep" />
      </div>
    </main>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, signOutUser } = useAuth();
  const active = useActiveHouse(user?.uid ?? null);
  const houseId = active.houseId;

  const userDoc = useUserDoc(user?.uid ?? null);
  const house = useHouse(houseId);
  const members = useMembers(houseId);
  const expenses = useExpenses(houseId);
  const settlements = useSettlements(houseId);
  const recurringBills = useRecurringBills(houseId);

  const isPremium = isPremiumFn(userDoc.data?.premiumUntil);

  const [addOpen, setAddOpen] = useState(false);
  const [expensePrefill, setExpensePrefill] = useState<ExpensePrefill | null>(null);
  const [settleOpen, setSettleOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/auth");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (active.noHouse) router.replace("/onboarding");
  }, [active.noHouse, router]);

  if (authLoading || !user) return <CenteredSpinner />;
  if (active.noHouse) return <CenteredSpinner />;
  if (!houseId && !active.error) return <CenteredSpinner />;

  const errored = active.error || house.error || members.error || expenses.error;
  if (errored && !house.data) {
    return (
      <LoadErrorScreen
        onRetry={() => window.location.reload()}
        onSignOut={() => signOutUser()}
      />
    );
  }

  if (house.loading && !house.data) return <DashboardSkeleton />;
  if (!house.data) return <DashboardSkeleton />;

  const me = members.data.find((m) => m.uid === user.uid);
  const balance = me?.balance ?? 0;
  const settled = Math.abs(balance) < 0.01;

  async function copyCode() {
    if (!house.data) return;
    try {
      await navigator.clipboard.writeText(house.data.inviteCode);
      setCopied(true);
      toast.success("Invite code copied");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't copy the code");
    }
  }

  function handleLogBill(bill: RecurringBill) {
    setExpensePrefill({
      description: bill.label,
      amount: bill.amount.toString(),
      category: bill.category,
      splitType: "custom",
      splits: Object.fromEntries(
        Object.entries(bill.splits).map(([uid, amt]) => [uid, amt.toString()]),
      ),
    });
    setAddOpen(true);
  }

  const balanceColor = settled
    ? "var(--color-ink)"
    : balance > 0
      ? "var(--color-credit)"
      : "var(--color-debit)";

  const glowColor = settled
    ? "var(--color-gold)"
    : balance > 0
      ? "var(--color-credit)"
      : "var(--color-debit)";

  return (
    <div className="min-h-dvh">
      <OfflineBanner />

      {/* Header */}
      <header className="sticky top-0 z-20 bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 sm:px-8 py-4">
          <Wordmark size="sm" className="hidden sm:inline-flex" />
          <div className="min-w-0 flex-1 sm:border-l sm:border-line sm:pl-4">
            <p className="truncate font-display text-base font-semibold text-ink">
              {house.data.name}
            </p>
            <button
              type="button"
              onClick={copyCode}
              className="group inline-flex items-center gap-1.5 text-xs text-muted"
            >
              <span className="font-mono tracking-[0.2em]">
                {house.data.inviteCode}
              </span>
              {copied ? (
                <Check className="h-3 w-3 text-credit" />
              ) : (
                <Copy className="h-3 w-3 transition group-hover:text-gold-deep" />
              )}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {isPremium && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-gold-soft/60 px-2.5 py-0.5 text-xs font-medium text-gold-deep">
                <Sparkles className="h-3 w-3" />
                Premium
              </span>
            )}
            <Link
              href="/house/settings"
              className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-paper-deep hover:text-ink"
              aria-label="House settings"
            >
              <Settings className="h-5 w-5" />
            </Link>
            <button
              type="button"
              onClick={() => signOutUser()}
              className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-paper-deep hover:text-ink"
              aria-label="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 sm:px-8 py-8 pb-28 sm:pb-12">
        {/* Balance hero */}
        <section className="relative overflow-hidden rounded-[1.25rem] bg-surface px-7 py-10 sm:px-10 sm:py-14">
          <div
            className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full opacity-20 blur-3xl"
            style={{ background: glowColor }}
          />
          <div
            className="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full opacity-10 blur-3xl"
            style={{ background: glowColor }}
          />
          <p className="eyebrow relative">Your balance</p>
          <p
            className="tnum relative mt-3 font-display font-semibold leading-none tracking-tight"
            style={{
              color: balanceColor,
              fontSize: "clamp(3.2rem, 9vw, 5.5rem)",
            }}
          >
            {settled ? formatPHP(0) : formatPHP(Math.abs(balance))}
          </p>
          <p className="relative mt-4 text-base text-muted">
            {settled
              ? "You're all settled up with the house."
              : balance > 0
                ? "the house owes you, all in."
                : "you owe the house, all in."}
          </p>
          <div className="relative mt-8 flex flex-wrap gap-3">
            <Button
              variant="gold"
              size="lg"
              onClick={() => {
                setExpensePrefill(null);
                setAddOpen(true);
              }}
            >
              <Plus className="h-4.5 w-4.5" />
              Add expense
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setSettleOpen(true)}
            >
              <HandCoins className="h-4.5 w-4.5" />
              Settle up
            </Button>
          </div>
        </section>

        {/* Dashboard grid */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Left column */}
          <div className="flex flex-col gap-6">
            <MonthlyOverview expenses={expenses.data} meUid={user.uid} />
            <BudgetCard
              expenses={expenses.data}
              budget={house.data.monthlyBudget}
              isPremium={isPremium}
            />
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="eyebrow mb-0">Expenses</p>
                <ReportExportButton
                  expenses={expenses.data}
                  members={members.data}
                  meUid={user.uid}
                  isPremium={isPremium}
                  houseName={house.data.name}
                />
              </div>
              <ExpenseFeed expenses={expenses.data} meUid={user.uid} />
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-6">
            <MembersCard members={members.data} meUid={user.uid} />
            <RecurringBillsCard
              bills={recurringBills.data}
              members={members.data}
              meUid={user.uid}
              isPremium={isPremium}
              onLogBill={handleLogBill}
            />
            <ExpenseCalendar expenses={expenses.data} />
            <SettlementHistory
              settlements={settlements.data}
              meUid={user.uid}
            />
          </div>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line/60 bg-paper/95 backdrop-blur-md sm:hidden">
        <div className="flex h-16 items-center">
          <Link
            href="/house"
            className="flex flex-1 flex-col items-center gap-1 text-muted transition active:text-ink"
          >
            <Home className="h-5 w-5" />
            <span className="text-[10px] font-medium tracking-wide">Home</span>
          </Link>
          <div className="-mt-6 flex flex-1 items-center justify-center">
            <button
              type="button"
              onClick={() => {
                setExpensePrefill(null);
                setAddOpen(true);
              }}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-deep text-white shadow-lift transition active:scale-95"
              aria-label="Add expense"
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>
          <Link
            href="/house/settings"
            className="flex flex-1 flex-col items-center gap-1 text-muted transition active:text-ink"
          >
            <Settings className="h-5 w-5" />
            <span className="text-[10px] font-medium tracking-wide">
              Settings
            </span>
          </Link>
        </div>
      </nav>

      <AddExpenseSheet
        open={addOpen}
        onOpenChange={(v) => {
          setAddOpen(v);
          if (!v) setExpensePrefill(null);
        }}
        members={members.data}
        meUid={user.uid}
        isPremium={isPremium}
        prefill={expensePrefill}
      />
      <SettleSheet
        open={settleOpen}
        onOpenChange={setSettleOpen}
        members={members.data}
        meUid={user.uid}
      />
    </div>
  );
}
