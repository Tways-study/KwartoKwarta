# Premium Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build four premium-gated features (monthly budget, recurring bills, AI receipt scan, CSV export) behind a mock per-user subscription that writes `premiumUntil` to the user's Firestore doc.

**Architecture:** Premium status lives on `users/{uid}.premiumUntil` (Firestore). A `useUserDoc` hook provides a live `onSnapshot` so the dashboard re-renders the moment the mock subscribe writes the timestamp. `isPremium` is derived once in `DashboardPage` and passed as a prop. All writes go through Next.js API routes (Admin SDK). A reusable `PremiumGate` wraps content — dimming it and overlaying an upgrade CTA for non-premium users.

**Tech Stack:** Next.js 16 App Router · Firebase Admin SDK · `@google/genai` (Gemini 2.0 Flash) · React 19 · Tailwind CSS v4 · zod · `@base-ui/react` Dialog · `sonner`

---

## File Map

**Create:**
- `lib/utils/premium.ts` — `isPremium(premiumUntil)` check
- `lib/schemas/recurringBill.ts` — zod schema + `CreateRecurringBillInput` type
- `app/api/premium/subscribe/route.ts` — writes `premiumUntil = now + 30 days`
- `app/api/houses/budget/route.ts` — sets `houses/{houseId}.monthlyBudget`
- `app/api/houses/recurring-bills/route.ts` — POST add / DELETE remove
- `app/api/expenses/scan-receipt/route.ts` — Gemini Vision OCR
- `components/PremiumSheet.tsx` — "Go Premium" bottom sheet with benefits + subscribe button
- `components/PremiumGate.tsx` — dims children + overlays upgrade CTA when not premium
- `components/BudgetCard.tsx` — spend vs. budget progress card
- `components/RecurringBillsCard.tsx` — recurring bill list + add sheet
- `components/ReportExportButton.tsx` — CSV download (client-side, no new deps)

**Modify:**
- `lib/firebase/schema.ts` — add `premiumUntil` to `UserDoc`, `monthlyBudget` to `HouseDoc`, add `RecurringBillDoc`/`RecurringBill`
- `lib/hooks/firestore.ts` — add `useUserDoc`, `useRecurringBills`
- `lib/api.ts` — multipart FormData support + `subscribe`, `setBudget`, `addRecurringBill`, `removeRecurringBill`, `scanReceipt`
- `components/AddExpenseSheet.tsx` — add `isPremium` + `prefill` props + scan receipt button
- `app/house/page.tsx` — call `useUserDoc`, derive `isPremium`, mount all new components

---

### Task 1: Schema extensions + isPremium utility

**Files:**
- Modify: `lib/firebase/schema.ts`
- Create: `lib/utils/premium.ts`

- [ ] **Step 1.1: Extend schema types**

In `lib/firebase/schema.ts`, add `premiumUntil` to `UserDoc`, `monthlyBudget` to `HouseDoc`, and add `RecurringBillDoc` after `SettlementDoc`:

```ts
export interface UserDoc {
  displayName: string;
  email: string;
  photoURL: string | null;
  houseId: string | null;
  premiumUntil?: FsTimestamp | null;  // add this line
  createdAt: FsTimestamp;
}

export interface HouseDoc {
  name: string;
  inviteCode: string;
  createdBy: string;
  createdAt: FsTimestamp;
  memberCount: number;
  monthlyBudget?: number;             // add this line
}

// Add after SettlementDoc:
export interface RecurringBillDoc {
  label: string;
  amount: number;
  cadence: "monthly";
  splits: Record<string, number>; // uid -> share amount
  category: ExpenseCategory;
  createdAt: FsTimestamp;
}

export type RecurringBill = WithId<RecurringBillDoc>;
```

- [ ] **Step 1.2: Create isPremium utility**

Create `lib/utils/premium.ts`:

```ts
import type { FsTimestamp } from "@/lib/firebase/schema";

export function isPremium(premiumUntil?: FsTimestamp | null): boolean {
  if (!premiumUntil) return false;
  return premiumUntil.seconds > Date.now() / 1000;
}
```

- [ ] **Step 1.3: Verify build**

```bash
npm run build
```

Expected: exits with code 0, no TypeScript errors.

- [ ] **Step 1.4: Commit**

```bash
git add lib/firebase/schema.ts lib/utils/premium.ts
git commit -m "feat: extend schema with premium fields + RecurringBillDoc; add isPremium utility"
```

---

### Task 2: Firestore hooks + recurring bill zod schema

**Files:**
- Modify: `lib/hooks/firestore.ts`
- Create: `lib/schemas/recurringBill.ts`

- [ ] **Step 2.1: Add useUserDoc and useRecurringBills to firestore.ts**

Update the import at the top of `lib/hooks/firestore.ts` to include the new types:

```ts
import type { Expense, House, Member, RecurringBill, Settlement, UserDoc } from "@/lib/firebase/schema";
```

Then add these two exports at the bottom of the file:

```ts
export function useUserDoc(uid: string | null): DocState<UserDoc> {
  return useDoc<UserDoc>(uid ? ["users", uid] : null);
}

export function useRecurringBills(houseId: string | null): ListState<RecurringBill> {
  return useCollection<RecurringBill>(houseId, "recurring_bills", "createdAt", "asc");
}
```

- [ ] **Step 2.2: Create recurring bill zod schema**

Create `lib/schemas/recurringBill.ts`:

```ts
import { z } from "zod";
import { EXPENSE_CATEGORIES } from "@/lib/schemas/expense";

export const createRecurringBillSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Add a label")
    .max(80, "Keep it under 80 characters"),
  amount: z.number().positive("Amount must be greater than 0").max(10_000_000),
  category: z.enum(EXPENSE_CATEGORIES),
  splits: z.record(z.string(), z.number().nonnegative()),
});

export type CreateRecurringBillInput = z.infer<typeof createRecurringBillSchema>;
```

- [ ] **Step 2.3: Verify build**

```bash
npm run build
```

Expected: exits with code 0.

- [ ] **Step 2.4: Commit**

```bash
git add lib/hooks/firestore.ts lib/schemas/recurringBill.ts
git commit -m "feat: add useUserDoc + useRecurringBills hooks; add recurringBill zod schema"
```

---

### Task 3: Extend API client

**Files:**
- Modify: `lib/api.ts`

- [ ] **Step 3.1: Replace lib/api.ts with multipart support + new methods**

Replace the entire contents of `lib/api.ts`:

```ts
"use client";

import { auth } from "@/lib/firebase/client";
import type { ExpenseCategory } from "@/lib/firebase/schema";
import type { CreateExpenseInput } from "@/lib/schemas/expense";
import type { CreateSettlementInput } from "@/lib/schemas/settlement";
import type { CreateRecurringBillInput } from "@/lib/schemas/recurringBill";

export interface ScanReceiptResult {
  description?: string;
  amount?: number;
  category?: ExpenseCategory;
  date?: string;
}

async function authedFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error("You're signed out. Please sign in again.");

  const token = await user.getIdToken();
  // Don't set Content-Type for FormData — browser must set it with the multipart boundary.
  const isMultipart = init?.body instanceof FormData;

  const res = await fetch(path, {
    ...init,
    headers: {
      ...(isMultipart ? {} : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      (data.error as string) || `Request failed (${res.status})`,
    );
  }
  return data as T;
}

export const api = {
  createHouse: (name: string) =>
    authedFetch<{ houseId: string; inviteCode: string }>("/api/houses", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  joinHouse: (inviteCode: string) =>
    authedFetch<{ houseId: string }>("/api/houses/join", {
      method: "POST",
      body: JSON.stringify({ inviteCode }),
    }),

  leaveHouse: () =>
    authedFetch<{ ok: true }>("/api/houses/leave", { method: "POST" }),

  addExpense: (input: CreateExpenseInput) =>
    authedFetch<{ expenseId: string }>("/api/expenses", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  addSettlement: (input: CreateSettlementInput) =>
    authedFetch<{ settlementId: string }>("/api/settlements", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  subscribe: () =>
    authedFetch<{ ok: true }>("/api/premium/subscribe", { method: "POST" }),

  setBudget: (amount: number) =>
    authedFetch<{ ok: true }>("/api/houses/budget", {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),

  addRecurringBill: (input: CreateRecurringBillInput) =>
    authedFetch<{ billId: string }>("/api/houses/recurring-bills", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  removeRecurringBill: (billId: string) =>
    authedFetch<{ ok: true }>(`/api/houses/recurring-bills?billId=${billId}`, {
      method: "DELETE",
    }),

  scanReceipt: (file: File) => {
    const fd = new FormData();
    fd.append("image", file);
    return authedFetch<ScanReceiptResult>("/api/expenses/scan-receipt", {
      method: "POST",
      body: fd,
    });
  },
};
```

- [ ] **Step 3.2: Verify build**

```bash
npm run build
```

Expected: exits with code 0.

- [ ] **Step 3.3: Commit**

```bash
git add lib/api.ts
git commit -m "feat: extend API client — multipart FormData support + subscribe, budget, recurring bills, receipt scan"
```

---

### Task 4: Subscribe API route

**Files:**
- Create: `app/api/premium/subscribe/route.ts`

- [ ] **Step 4.1: Create the mock subscribe route**

Create `app/api/premium/subscribe/route.ts`:

```ts
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { fail, requireUser } from "@/lib/server/helpers";

export const runtime = "nodejs";

// POST /api/premium/subscribe — mock: sets premiumUntil = now + 30 days on the user doc.
export async function POST(req: Request) {
  try {
    const token = await requireUser(req);

    const premiumUntil = Timestamp.fromMillis(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    );

    await getAdminDb()
      .collection("users")
      .doc(token.uid)
      .set({ premiumUntil }, { merge: true });

    return Response.json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
```

- [ ] **Step 4.2: Verify build**

```bash
npm run build
```

Expected: exits with code 0.

- [ ] **Step 4.3: Commit**

```bash
git add app/api/premium/subscribe/route.ts
git commit -m "feat: add mock premium subscribe API route (writes premiumUntil = now + 30 days)"
```

---

### Task 5: PremiumSheet + PremiumGate components

**Files:**
- Create: `components/PremiumSheet.tsx`
- Create: `components/PremiumGate.tsx`

- [ ] **Step 5.1: Create PremiumSheet**

Create `components/PremiumSheet.tsx`:

```tsx
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
```

- [ ] **Step 5.2: Create PremiumGate**

Create `components/PremiumGate.tsx`:

```tsx
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
```

- [ ] **Step 5.3: Verify build**

```bash
npm run build
```

Expected: exits with code 0.

- [ ] **Step 5.4: Commit**

```bash
git add components/PremiumSheet.tsx components/PremiumGate.tsx
git commit -m "feat: add PremiumSheet (Go Premium bottom sheet) and PremiumGate wrapper"
```

---

### Task 6: Budget API route + BudgetCard component

**Files:**
- Create: `app/api/houses/budget/route.ts`
- Create: `components/BudgetCard.tsx`

- [ ] **Step 6.1: Create budget API route**

Create `app/api/houses/budget/route.ts`:

```ts
import { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import { HttpError, fail, requireUser } from "@/lib/server/helpers";
import { isPremium } from "@/lib/utils/premium";

export const runtime = "nodejs";

const schema = z.object({
  amount: z.number().nonnegative("Budget must be 0 or more"),
});

// POST /api/houses/budget — set (or clear with 0) the house monthly budget.
// Premium-only. Server reads houseId from the user doc.
export async function POST(req: Request) {
  try {
    const token = await requireUser(req);
    const { amount } = schema.parse(await req.json());

    const adminDb = getAdminDb();
    const userSnap = await adminDb.collection("users").doc(token.uid).get();

    if (!isPremium(userSnap.data()?.premiumUntil)) {
      throw new HttpError(403, "This feature requires a premium subscription.");
    }

    const houseId = userSnap.data()?.houseId as string | undefined;
    if (!houseId) throw new HttpError(400, "Join or create a house first.");

    await adminDb.collection("houses").doc(houseId).update({ monthlyBudget: amount });

    return Response.json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
```

- [ ] **Step 6.2: Create BudgetCard component**

Create `components/BudgetCard.tsx`:

```tsx
"use client";

import { useState } from "react";
import { isSameMonth } from "date-fns";
import { toast } from "sonner";
import { Card, CardEyebrow } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { PremiumGate } from "@/components/PremiumGate";
import type { Expense } from "@/lib/firebase/schema";
import { toDate, monthLabel } from "@/lib/utils/dates";
import { formatPHP } from "@/lib/utils/format";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface BudgetCardProps {
  expenses: Expense[];
  budget: number | undefined;
  isPremium: boolean;
}

export function BudgetCard({ expenses, budget, isPremium }: BudgetCardProps) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const spent = expenses
    .filter((e) => {
      const d = toDate(e.date);
      return d ? isSameMonth(d, now) : false;
    })
    .reduce((sum, e) => sum + e.amount, 0);

  const pct = budget && budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const over = budget != null && spent > budget;
  const barColor = over ? "bg-debit" : pct >= 75 ? "bg-gold" : "bg-credit";

  async function save() {
    const n = Number.parseFloat(input);
    if (Number.isNaN(n) || n < 0) {
      toast.error("Enter a valid amount (or 0 to clear).");
      return;
    }
    setSaving(true);
    try {
      await api.setBudget(n);
      setEditing(false);
      toast.success(n === 0 ? "Budget cleared" : "Budget updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save budget");
    } finally {
      setSaving(false);
    }
  }

  const EditUI = (
    <div className="mt-5">
      {editing ? (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-muted">
              ₱
            </span>
            <Input
              inputMode="decimal"
              placeholder="0.00"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="tnum pl-7"
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
          </div>
          <Button variant="gold" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button variant="outline" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setInput(budget?.toString() ?? "");
            setEditing(true);
          }}
        >
          {budget ? "Edit budget" : "Set budget"}
        </Button>
      )}
    </div>
  );

  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <CardEyebrow className="mb-0">Budget · {monthLabel(now)}</CardEyebrow>
        {over && (
          <span className="text-xs font-medium text-debit">Over budget</span>
        )}
      </div>

      {budget ? (
        <>
          <div className="mt-4">
            <div className="flex items-baseline justify-between text-sm">
              <span className="tnum text-ink">{formatPHP(spent)} spent</span>
              <span className="tnum text-muted">of {formatPHP(budget)}</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-paper-deep">
              <div
                className={cn("h-full rounded-full transition-all", barColor)}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <PremiumGate isPremium={isPremium}>{EditUI}</PremiumGate>
        </>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-muted">
            No budget set. Track monthly spending against a limit.
          </p>
          <PremiumGate isPremium={isPremium}>{EditUI}</PremiumGate>
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 6.3: Verify build**

```bash
npm run build
```

Expected: exits with code 0.

- [ ] **Step 6.4: Commit**

```bash
git add app/api/houses/budget/route.ts components/BudgetCard.tsx
git commit -m "feat: add budget API route and BudgetCard component"
```

---

### Task 7: Recurring bills API + RecurringBillsCard

**Files:**
- Create: `app/api/houses/recurring-bills/route.ts`
- Create: `components/RecurringBillsCard.tsx`

- [ ] **Step 7.1: Create recurring bills API route**

Create `app/api/houses/recurring-bills/route.ts`:

```ts
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { HttpError, fail, requireUser } from "@/lib/server/helpers";
import { createRecurringBillSchema } from "@/lib/schemas/recurringBill";
import { isPremium } from "@/lib/utils/premium";

export const runtime = "nodejs";

async function getPremiumHouseId(uid: string): Promise<string> {
  const adminDb = getAdminDb();
  const userSnap = await adminDb.collection("users").doc(uid).get();
  if (!isPremium(userSnap.data()?.premiumUntil)) {
    throw new HttpError(403, "This feature requires a premium subscription.");
  }
  const houseId = userSnap.data()?.houseId as string | undefined;
  if (!houseId) throw new HttpError(400, "Join or create a house first.");
  return houseId;
}

// POST /api/houses/recurring-bills — add a recurring bill (premium).
export async function POST(req: Request) {
  try {
    const token = await requireUser(req);
    const input = createRecurringBillSchema.parse(await req.json());
    const houseId = await getPremiumHouseId(token.uid);

    const ref = getAdminDb()
      .collection("houses")
      .doc(houseId)
      .collection("recurring_bills")
      .doc();

    await ref.set({
      ...input,
      cadence: "monthly",
      createdAt: FieldValue.serverTimestamp(),
    });

    return Response.json({ billId: ref.id });
  } catch (err) {
    return fail(err);
  }
}

// DELETE /api/houses/recurring-bills?billId=xxx — remove a bill (premium).
export async function DELETE(req: Request) {
  try {
    const token = await requireUser(req);
    const billId = new URL(req.url).searchParams.get("billId");
    if (!billId) throw new HttpError(400, "billId is required.");

    const houseId = await getPremiumHouseId(token.uid);

    await getAdminDb()
      .collection("houses")
      .doc(houseId)
      .collection("recurring_bills")
      .doc(billId)
      .delete();

    return Response.json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
```

- [ ] **Step 7.2: Create RecurringBillsCard component**

Create `components/RecurringBillsCard.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardEyebrow } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { PremiumGate } from "@/components/PremiumGate";
import { CATEGORIES, CATEGORY_LIST } from "@/lib/categories";
import type { ExpenseCategory, Member, RecurringBill } from "@/lib/firebase/schema";
import { formatPHP } from "@/lib/utils/format";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

function AddBillSheet({
  open,
  onOpenChange,
  members,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  members: Member[];
}) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("other");
  const [saving, setSaving] = useState(false);

  const uids = members.map((m) => m.uid);
  const amountNum = Number.parseFloat(amount) || 0;

  function resetForm() {
    setLabel("");
    setAmount("");
    setCategory("other");
  }

  // Equal split with penny distribution to first member
  function buildSplits(): Record<string, number> {
    const n = uids.length || 1;
    const cents = Math.round(amountNum * 100);
    const base = Math.floor(cents / n);
    const rem = cents - base * n;
    return Object.fromEntries(
      uids.map((uid, i) => [uid, (base + (i === 0 ? rem : 0)) / 100]),
    );
  }

  async function save() {
    if (!label.trim()) {
      toast.error("Add a label.");
      return;
    }
    if (amountNum <= 0) {
      toast.error("Enter a positive amount.");
      return;
    }
    setSaving(true);
    try {
      await api.addRecurringBill({
        label: label.trim(),
        amount: amountNum,
        category,
        splits: buildSplits(),
      });
      toast.success("Recurring bill added");
      onOpenChange(false);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add bill");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) resetForm();
      }}
      title="Add recurring bill"
      description="Split equally among all members. Edit splits later by logging as an expense."
      footer={
        <Button
          variant="gold"
          size="lg"
          className="w-full"
          onClick={save}
          disabled={saving}
        >
          {saving ? "Adding…" : "Add bill"}
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <div>
          <Label htmlFor="bill-label">Label</Label>
          <Input
            id="bill-label"
            placeholder="e.g. Meralco, PLDT, Water bill"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="bill-amount">Amount</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-lg text-muted">
              ₱
            </span>
            <Input
              id="bill-amount"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="tnum h-14 pl-9 text-2xl font-semibold"
            />
          </div>
          {amountNum > 0 && uids.length > 0 && (
            <p className="mt-1 text-xs text-muted">
              {formatPHP(amountNum / uids.length)} each · split equally across{" "}
              {uids.length} boardmates
            </p>
          )}
        </div>
        <div>
          <Label>Category</Label>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORY_LIST.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 transition",
                  c.key === category
                    ? "border-gold bg-gold-soft/50"
                    : "border-line bg-surface hover:bg-paper-deep",
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-lg",
                    c.bg,
                    c.text,
                  )}
                >
                  <c.Icon className="h-4 w-4" />
                </span>
                <span className="text-[11px] font-medium text-ink-soft">
                  {c.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  );
}

interface RecurringBillsCardProps {
  bills: RecurringBill[];
  members: Member[];
  meUid: string;
  isPremium: boolean;
  onLogBill: (bill: RecurringBill) => void;
}

export function RecurringBillsCard({
  bills,
  members,
  meUid,
  isPremium,
  onLogBill,
}: RecurringBillsCardProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  async function remove(billId: string) {
    setRemoving(billId);
    try {
      await api.removeRecurringBill(billId);
      toast.success("Bill removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't remove");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardEyebrow className="mb-0">Recurring bills</CardEyebrow>
        <PremiumGate isPremium={isPremium}>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted transition hover:bg-paper-deep hover:text-ink"
            aria-label="Add recurring bill"
          >
            <Plus className="h-4 w-4" />
          </button>
        </PremiumGate>
      </div>

      {bills.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          No recurring bills yet. Add monthly bills for quick one-tap logging.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-line">
          {bills.map((bill) => {
            const meta = CATEGORIES[bill.category];
            return (
              <li key={bill.id} className="flex items-center gap-3 py-3">
                <span
                  className={cn(
                    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    meta.bg,
                    meta.text,
                  )}
                >
                  <meta.Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {bill.label}
                  </p>
                  <p className="tnum text-xs text-muted">
                    {formatPHP(bill.amount)} · monthly
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onLogBill(bill)}
                >
                  Log now
                </Button>
                <button
                  type="button"
                  onClick={() => remove(bill.id)}
                  disabled={removing === bill.id}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-debit-soft hover:text-debit disabled:opacity-50"
                  aria-label="Remove bill"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <AddBillSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        members={members}
      />
    </Card>
  );
}
```

- [ ] **Step 7.3: Verify build**

```bash
npm run build
```

Expected: exits with code 0.

- [ ] **Step 7.4: Commit**

```bash
git add app/api/houses/recurring-bills/route.ts components/RecurringBillsCard.tsx
git commit -m "feat: add recurring bills API route and RecurringBillsCard component"
```

---

### Task 8: Receipt scan API route

**Files:**
- Install: `@google/genai`
- Create: `app/api/expenses/scan-receipt/route.ts`

- [ ] **Step 8.1: Install @google/genai**

```bash
npm install @google/genai
```

Expected: `@google/genai` appears in `dependencies` in `package.json`.

- [ ] **Step 8.2: Create scan-receipt API route**

Create `app/api/expenses/scan-receipt/route.ts`:

```ts
import { GoogleGenAI } from "@google/genai";
import { getAdminDb } from "@/lib/firebase/admin";
import { HttpError, fail, requireUser } from "@/lib/server/helpers";
import { isPremium } from "@/lib/utils/premium";
import type { ExpenseCategory } from "@/lib/firebase/schema";

export const runtime = "nodejs";

const VALID_CATEGORIES: ExpenseCategory[] = [
  "electric",
  "water",
  "internet",
  "grocery",
  "rent",
  "cleaning",
  "other",
];

// POST /api/expenses/scan-receipt — Gemini Vision receipt OCR (premium only).
// Accepts multipart/form-data with field "image". Returns partial expense prefill.
export async function POST(req: Request) {
  try {
    const token = await requireUser(req);

    const adminDb = getAdminDb();
    const userSnap = await adminDb.collection("users").doc(token.uid).get();
    if (!isPremium(userSnap.data()?.premiumUntil)) {
      throw new HttpError(403, "This feature requires a premium subscription.");
    }

    const form = await req.formData();
    const file = form.get("image");
    if (!(file instanceof File)) throw new HttpError(400, "No image provided.");

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const mimeType = file.type || "image/jpeg";

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { data: base64, mimeType } },
            {
              text: 'Extract the expense details from this receipt. Return ONLY valid JSON (no markdown) with these fields — omit fields you cannot determine: { "description": string, "amount": number, "category": one of ["electric","water","internet","grocery","rent","cleaning","other"], "date": "YYYY-MM-DD" }',
            },
          ],
        },
      ],
    });

    const raw = result.text ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return Response.json({});

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return Response.json({});
    }

    return Response.json({
      description:
        typeof parsed.description === "string" ? parsed.description : undefined,
      amount:
        typeof parsed.amount === "number" && parsed.amount > 0
          ? parsed.amount
          : undefined,
      category: VALID_CATEGORIES.includes(parsed.category as ExpenseCategory)
        ? (parsed.category as ExpenseCategory)
        : undefined,
      date:
        typeof parsed.date === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)
          ? parsed.date
          : undefined,
    });
  } catch (err) {
    return fail(err);
  }
}
```

- [ ] **Step 8.3: Verify build**

```bash
npm run build
```

Expected: exits with code 0. If `GoogleGenAI` import fails, check the package's exports:
```bash
node -e "console.log(Object.keys(require('@google/genai')))"
```
Use whichever export name is shown for the main client class.

- [ ] **Step 8.4: Commit**

```bash
git add package.json package-lock.json app/api/expenses/scan-receipt/route.ts
git commit -m "feat: add Gemini receipt scan API route (premium-gated)"
```

---

### Task 9: AddExpenseSheet — scan receipt button + prefill prop

**Files:**
- Modify: `components/AddExpenseSheet.tsx`

- [ ] **Step 9.1: Replace AddExpenseSheet with scan receipt + prefill support**

Replace the entire contents of `components/AddExpenseSheet.tsx`:

```tsx
"use client";

import { useRef, useMemo, useState } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { Avatar } from "@/components/ui/avatar";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { PremiumSheet } from "@/components/PremiumSheet";
import { CATEGORY_LIST } from "@/lib/categories";
import type { ExpenseCategory, Member, SplitType } from "@/lib/firebase/schema";
import { createExpenseSchema } from "@/lib/schemas/expense";
import { toDateInputValue } from "@/lib/utils/dates";
import { formatPHP } from "@/lib/utils/format";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export interface ExpensePrefill {
  description?: string;
  amount?: string;
  category?: ExpenseCategory;
  splitType?: SplitType;
  splits?: Record<string, string>; // uid -> string value for custom inputs
}

function equalSplits(amount: number, uids: string[]): Record<string, number> {
  const n = uids.length || 1;
  const cents = Math.round(amount * 100);
  const base = Math.floor(cents / n);
  const rem = cents - base * n;
  const out: Record<string, number> = {};
  uids.forEach((uid, i) => {
    out[uid] = (base + (i < rem ? 1 : 0)) / 100;
  });
  return out;
}

export function AddExpenseSheet({
  open,
  onOpenChange,
  members,
  meUid,
  isPremium,
  prefill,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  meUid: string;
  isPremium: boolean;
  prefill?: ExpensePrefill | null;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("grocery");
  const [paidBy, setPaidBy] = useState(meUid);
  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uids = useMemo(() => members.map((m) => m.uid), [members]);

  // Reset (or apply prefill) each time the sheet opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDescription(prefill?.description ?? "");
      setAmount(prefill?.amount ?? "");
      setCategory(prefill?.category ?? "grocery");
      setSplitType(prefill?.splitType ?? "equal");
      setCustom(prefill?.splits ?? {});
      setPaidBy(meUid);
      setDate(toDateInputValue(new Date()));
    }
  }

  const amountNum = Number.parseFloat(amount) || 0;
  const customSum = uids.reduce(
    (sum, uid) => sum + (Number.parseFloat(custom[uid] ?? "") || 0),
    0,
  );
  const customBalanced = Math.abs(customSum - amountNum) < 0.01;

  const splits =
    splitType === "equal"
      ? equalSplits(amountNum, uids)
      : Object.fromEntries(
          uids.map((uid) => [uid, Number.parseFloat(custom[uid] ?? "") || 0]),
        );

  async function submit() {
    const parsed = createExpenseSchema.safeParse({
      description,
      amount: amountNum,
      paidBy,
      category,
      splitType,
      splits,
      date,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the form.");
      return;
    }
    if (splitType === "custom" && !customBalanced) {
      toast.error("Custom splits must add up to the total.");
      return;
    }
    setSubmitting(true);
    try {
      await api.addExpense(parsed.data);
      toast.success("Expense added");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add expense");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleScanFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // reset so the same file can be picked again
    setScanning(true);
    try {
      const result = await api.scanReceipt(file);
      if (result.description) setDescription(result.description);
      if (result.amount) setAmount(result.amount.toString());
      if (result.category) setCategory(result.category);
      if (result.date) setDate(result.date);
      toast.success("Receipt scanned — review the details below.");
    } catch {
      toast.error("Couldn't read the receipt — fill it in manually.");
    } finally {
      setScanning(false);
    }
  }

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        title="Add an expense"
        description="Log a shared cost and we'll update everyone's balance."
        footer={
          <Button
            variant="gold"
            size="lg"
            className="w-full"
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? "Adding…" : `Add ${formatPHP(amountNum)}`}
          </Button>
        }
      >
        <div className="flex flex-col gap-6">
          <div>
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-lg text-muted">
                ₱
              </span>
              <Input
                id="amount"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="tnum h-14 pl-9 text-2xl font-semibold"
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <Label htmlFor="description" className="mb-0">
                What for?
              </Label>
              <button
                type="button"
                onClick={() => {
                  if (!isPremium) {
                    setPremiumOpen(true);
                    return;
                  }
                  fileInputRef.current?.click();
                }}
                disabled={scanning}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted transition hover:bg-paper-deep hover:text-ink disabled:opacity-50"
                aria-label="Scan receipt"
              >
                {scanning ? (
                  <Spinner size={12} />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
                {scanning ? "Scanning…" : "Scan receipt"}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleScanFile}
            />
            <Input
              id="description"
              placeholder="e.g. Meralco bill, palengke run"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <Label>Category</Label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORY_LIST.map((c) => {
                const active = c.key === category;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setCategory(c.key)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 transition",
                      active
                        ? "border-gold bg-gold-soft/50"
                        : "border-line bg-surface hover:bg-paper-deep",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex h-8 w-8 items-center justify-center rounded-lg",
                        c.bg,
                        c.text,
                      )}
                    >
                      <c.Icon className="h-4 w-4" />
                    </span>
                    <span className="text-[11px] font-medium text-ink-soft">
                      {c.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label>Paid by</Label>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => {
                const active = m.uid === paidBy;
                return (
                  <button
                    key={m.uid}
                    type="button"
                    onClick={() => setPaidBy(m.uid)}
                    className={cn(
                      "flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition",
                      active
                        ? "border-gold bg-gold-soft/50 text-ink"
                        : "border-line bg-surface text-ink-soft hover:bg-paper-deep",
                    )}
                  >
                    <Avatar name={m.displayName} photoURL={m.photoURL} size={26} />
                    {m.uid === meUid ? "You" : m.displayName.split(" ")[0]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="mb-0">Split</Label>
              <Segmented
                value={splitType}
                onChange={(v) => setSplitType(v)}
                options={[
                  { value: "equal", label: "Equal" },
                  { value: "custom", label: "Custom" },
                ]}
              />
            </div>

            {splitType === "equal" ? (
              <p className="text-sm text-muted">
                Split evenly —{" "}
                <span className="tnum font-medium text-ink-soft">
                  {formatPHP(amountNum / (uids.length || 1))}
                </span>{" "}
                each across {uids.length}{" "}
                {uids.length === 1 ? "boardmate" : "boardmates"}.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {members.map((m) => (
                  <div key={m.uid} className="flex items-center gap-3">
                    <Avatar
                      name={m.displayName}
                      photoURL={m.photoURL}
                      size={28}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">
                      {m.uid === meUid ? "You" : m.displayName}
                    </span>
                    <div className="relative w-28">
                      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-sm text-muted">
                        ₱
                      </span>
                      <Input
                        inputMode="decimal"
                        placeholder="0.00"
                        value={custom[m.uid] ?? ""}
                        onChange={(e) =>
                          setCustom((prev) => ({
                            ...prev,
                            [m.uid]: e.target.value,
                          }))
                        }
                        className="tnum h-10 pl-6 text-right"
                      />
                    </div>
                  </div>
                ))}
                <div
                  className={cn(
                    "tear mt-1 flex items-center justify-between pt-2 text-sm",
                    customBalanced ? "text-credit" : "text-debit",
                  )}
                >
                  <span>{customBalanced ? "Balanced" : "Doesn't add up"}</span>
                  <span className="tnum font-medium">
                    {formatPHP(customSum)} / {formatPHP(amountNum)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Sheet>

      <PremiumSheet open={premiumOpen} onOpenChange={setPremiumOpen} />
    </>
  );
}
```

- [ ] **Step 9.2: Verify build**

```bash
npm run build
```

Expected: exits with code 0.

- [ ] **Step 9.3: Commit**

```bash
git add components/AddExpenseSheet.tsx
git commit -m "feat: add receipt scan button and prefill prop to AddExpenseSheet"
```

---

### Task 10: ReportExportButton component

**Files:**
- Create: `components/ReportExportButton.tsx`

- [ ] **Step 10.1: Create ReportExportButton**

Create `components/ReportExportButton.tsx`:

```tsx
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
```

- [ ] **Step 10.2: Verify build**

```bash
npm run build
```

Expected: exits with code 0.

- [ ] **Step 10.3: Commit**

```bash
git add components/ReportExportButton.tsx
git commit -m "feat: add ReportExportButton (client-side CSV export, premium-gated)"
```

---

### Task 11: Wire dashboard page

**Files:**
- Modify: `app/house/page.tsx`

- [ ] **Step 11.1: Replace dashboard page to wire all premium features**

Replace the entire contents of `app/house/page.tsx`:

```tsx
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
```

- [ ] **Step 11.2: Final build check**

```bash
npm run build
```

Expected: exits with code 0, no TypeScript errors, all routes and components compile cleanly.

- [ ] **Step 11.3: Commit**

```bash
git add app/house/page.tsx
git commit -m "feat: wire premium features into dashboard — budget, recurring bills, receipt scan, export, premium badge"
```

---

## Self-Review

**Spec coverage:**
- ✅ Schema: `premiumUntil`, `monthlyBudget`, `RecurringBillDoc` — Task 1
- ✅ `isPremium` utility — Task 1
- ✅ `useUserDoc` hook — Task 2
- ✅ Recurring bill zod schema — Task 2
- ✅ `useRecurringBills` hook — Task 2
- ✅ API client: multipart + 5 new methods — Task 3
- ✅ Subscribe API — Task 4
- ✅ `PremiumSheet` — Task 5
- ✅ `PremiumGate` — Task 5
- ✅ Budget API + `BudgetCard` — Task 6
- ✅ Recurring bills API (POST + DELETE) + `RecurringBillsCard` — Task 7
- ✅ Gemini receipt scan API (`@google/genai`) — Task 8
- ✅ `AddExpenseSheet`: `isPremium` prop + `prefill` prop + scan button — Task 9
- ✅ `ReportExportButton` CSV — Task 10
- ✅ Dashboard wiring + Premium badge + `handleLogBill` + `expensePrefill` — Task 11
- ✅ Firestore security rules: no changes needed (all premium writes via Admin SDK)

**Type consistency check:**
- `ExpensePrefill` exported from `AddExpenseSheet.tsx`, imported with `type` in `page.tsx` ✅
- `ScanReceiptResult` defined in `lib/api.ts`, used by `scanReceipt` return type ✅
- `CreateRecurringBillInput` from `lib/schemas/recurringBill.ts`, used in `api.ts` and `recurring-bills/route.ts` ✅
- `RecurringBill` from `lib/firebase/schema.ts`, used in hook, card, and dashboard ✅
- `isPremium` imported as `isPremiumFn` in `page.tsx` to avoid shadowing the boolean variable ✅

**No placeholders:** all steps contain complete runnable code.
