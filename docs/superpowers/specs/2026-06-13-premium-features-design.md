# Premium Features Design — KwartoKwarta

**Date:** 2026-06-13  
**Scope:** Four premium features gated behind a per-user subscription, plus the subscribe flow itself.

---

## 1. Premium Scope

Premium is **per-user**. Each user has a `premiumUntil` timestamp on their Firestore user doc. If that timestamp is in the future, the user is premium. Subscribe is a **mock** (no real payment): it writes `premiumUntil = now + 30 days`.

**Premium-gated features:**
1. Monthly budget (set + track house budget)
2. Recurring bills (reference list of monthly bills)
3. Receipt scan (Gemini Vision → prefill Add Expense)
4. Report export (CSV download of expenses)

---

## 2. Schema Changes

**`lib/firebase/schema.ts`**

`UserDoc` — add:
```ts
premiumUntil?: FsTimestamp | null;
```

`HouseDoc` — add:
```ts
monthlyBudget?: number;
```

New type `RecurringBillDoc`:
```ts
export interface RecurringBillDoc {
  label: string;
  amount: number;
  cadence: "monthly";
  splits: Record<string, number>; // uid -> share
  category: ExpenseCategory;
  createdAt: FsTimestamp;
}
export type RecurringBill = WithId<RecurringBillDoc>;
```

---

## 3. Premium Utility

New file **`lib/utils/premium.ts`**:
```ts
import type { FsTimestamp } from "@/lib/firebase/schema";

export function isPremium(premiumUntil?: FsTimestamp | null): boolean {
  if (!premiumUntil) return false;
  return premiumUntil.seconds > Date.now() / 1000;
}
```

---

## 4. `useUserDoc` Hook

Added to **`lib/hooks/firestore.ts`**:
```ts
export function useUserDoc(uid: string | null): DocState<UserDoc>
```
Reads `users/{uid}` via `onSnapshot` with the same timeout/error pattern as existing hooks. When `POST /api/premium/subscribe` writes `premiumUntil`, this fires automatically so all gates open without a page reload.

---

## 5. Subscribe API

**`app/api/premium/subscribe/route.ts`** — `POST`

- Verify bearer token via `requireUser`
- Write `premiumUntil = Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000)` to `users/{uid}` (merge)
- Return `{ ok: true }`

**`lib/api.ts`** additions:
```ts
subscribe: () => authedFetch<{ ok: true }>("/api/premium/subscribe", { method: "POST" }),
setBudget: (amount: number) => authedFetch<{ ok: true }>("/api/houses/budget", { method: "POST", body: JSON.stringify({ amount }) }),
addRecurringBill: (input: CreateRecurringBillInput) => authedFetch<{ billId: string }>("/api/houses/recurring-bills", { method: "POST", body: JSON.stringify(input) }),
removeRecurringBill: (billId: string) => authedFetch<{ ok: true }>(`/api/houses/recurring-bills?billId=${billId}`, { method: "DELETE" }),
scanReceipt: (file: File) => {
  const fd = new FormData();
  fd.append("image", file);
  // Do NOT set Content-Type — browser sets multipart boundary automatically
  return authedFetch<ScanReceiptResult>("/api/expenses/scan-receipt", { method: "POST", body: fd });
},
```

---

## 6. Premium Gate UI

### `PremiumSheet` (`components/PremiumSheet.tsx`)
Bottom sheet (reuses existing `Sheet` component) that lists the 4 premium benefits. Has a "Try 30 days free" button. On click: calls `api.subscribe()`, toasts success ("Premium activated — enjoy 30 days free!"), closes sheet. The `useUserDoc` onSnapshot update unlocks gates automatically.

### `PremiumGate` (`components/PremiumGate.tsx`)
```tsx
interface PremiumGateProps {
  isPremium: boolean;
  label: string;       // e.g. "Monthly budget"
  children: ReactNode;
}
```
- If `isPremium`: renders `children` as-is.
- If not premium: renders children with `pointer-events-none opacity-50`, overlaid with a lock icon + "Go Premium" button that opens `PremiumSheet`.

### Dashboard integration
`app/house/page.tsx` calls `useUserDoc(user.uid)` once and derives `isPremium` using `isPremiumFn(userDoc.data?.premiumUntil)`. Passes `isPremium` as a prop to all gated components. A small "Premium" badge shows in the header when active.

---

## 7. Monthly Budget

### API: `app/api/houses/budget/route.ts` — `POST`
- Verify token + premium (read `users/{uid}.premiumUntil`, check with `isPremium`)
- Validate body: `{ amount: number }` (zod: positive number or 0 to clear)
- `houses/{houseId}` update: `{ monthlyBudget: amount }`
- Return `{ ok: true }`

### Component: `BudgetCard` (`components/BudgetCard.tsx`)
- Props: `expenses: Expense[]`, `budget: number | undefined`, `isPremium: boolean`, `houseId: string`
- This-month total spend from `expenses` (same calc as `MonthlyOverview`)
- Shows spend vs. budget with a fill bar: green < 75%, amber 75–100%, red > 100%
- "Set budget" button opens inline edit (input + confirm) — wrapped in `PremiumGate`
- If no budget set: shows "Set a monthly budget" prompt
- Added to dashboard grid (left column, below `MonthlyOverview`)

---

## 8. Recurring Bills

### API: `app/api/houses/recurring-bills/route.ts`
- `POST` — premium check + zod validate `{ label, amount, category, splits }` + add doc to `houses/{houseId}/recurring_bills`
- `DELETE` — premium check + delete `houses/{houseId}/recurring_bills/{billId}` (query param `billId`)

### Zod schema: `lib/schemas/recurringBill.ts`
```ts
{ label: string (min 1), amount: positive number, category: ExpenseCategory, splits: Record<uid, number> }
```

### Hook: `useRecurringBills(houseId)` added to `lib/hooks/firestore.ts`
Reads `houses/{houseId}/recurring_bills` ordered by `createdAt asc`.

### Component: `RecurringBillsCard` (`components/RecurringBillsCard.tsx`)
- Props: `bills: RecurringBill[]`, `members: Member[]`, `meUid: string`, `isPremium: boolean`
- Lists bills with category icon, label, and amount
- Each bill has a "Log now" button that calls `onLogBill(bill)` — parent opens `AddExpenseSheet` with the bill's fields prefilled
- "Add bill" button (premium-gated) opens a small `Sheet` form with label, amount, category, splits fields
- Remove button (×) on each bill row removes via `api.removeRecurringBill(billId)`
- Added to dashboard grid (right column)

---

## 9. Receipt Scan

### Package: install `@google/genai`

### API: `app/api/expenses/scan-receipt/route.ts` — `POST`
- Verify token + premium
- Accept `multipart/form-data` with field `image` (the uploaded file)
- Convert to base64
- Call Gemini (`gemini-2.0-flash`) with the image and a prompt:
  > "Extract the expense details from this receipt. Return JSON only: { description: string, amount: number, category: one of [electric,water,internet,grocery,rent,cleaning,other], date: 'YYYY-MM-DD' }. If a field is unclear, omit it."
- Parse the JSON from Gemini's response
- Return `{ description?, amount?, category?, date? }` (partial — client fills gaps)
- `GEMINI_API_KEY` env var (already in `.env.local.example` per rebuild guide)

### UI in `AddExpenseSheet`
- `AddExpenseSheet` props gain `isPremium: boolean` (existing callers pass it from dashboard)
- Add a camera icon button next to the "What for?" field title
- If not premium: button click opens `PremiumSheet`
- If premium: button triggers hidden `<input type="file" accept="image/*" capture="environment">`
- On file select: show inline spinner on the button, POST to `/api/expenses/scan-receipt`
- On success: patch form state (`setDescription`, `setAmount`, `setCategory`, `setDate`) with returned values (only non-null fields)
- On error: toast "Couldn't read the receipt — fill it in manually"

---

## 10. Report Export

### Component: `ReportExportButton` (`components/ReportExportButton.tsx`)
- Props: `expenses: Expense[]`, `members: Member[]`, `meUid: string`, `isPremium: boolean`, `houseName: string`
- If not premium: clicking shows `PremiumSheet`
- If premium: generates CSV client-side:
  - Columns: `Date,Description,Category,Amount,Paid By,My Share`
  - Filename: `kwartokwarta-{houseName}-{YYYY-MM}.csv`
  - Creates a `Blob`, triggers anchor click download
- No new packages needed
- Placed in the dashboard, near the expense feed header (small "Export CSV" button with download icon)

---

## 11. Firestore Security Rules

No changes needed. All premium writes go through the Admin SDK (API routes). Client rules remain read-only.

---

## 12. Build Order (Approach A — vertical slices)

1. Schema + premium utility + `useUserDoc` hook
2. `POST /api/premium/subscribe` + `api.subscribe()` + `PremiumSheet` + `PremiumGate`
3. Monthly budget (API + `BudgetCard`)
4. Recurring bills (API + schema + hook + `RecurringBillsCard`)
5. Receipt scan (install `@google/genai` + API + `AddExpenseSheet` scan button)
6. Report export (`ReportExportButton`)
7. Wire all components into dashboard page with `isPremium` prop

---

## 13. Success Criteria

- Non-premium user sees locked (dimmed + lock) states for all 4 feature areas
- Clicking "Go Premium" opens `PremiumSheet`; clicking "Try 30 days free" writes `premiumUntil` and all gates open without reload
- Budget card shows correct spend/budget ratio and updates when a new expense is added
- Recurring bills can be added and removed; "Log now" prefills `AddExpenseSheet`
- Receipt scan sends an image to Gemini and prefills the expense form with returned fields
- Export button downloads a valid CSV with all current-house expenses
- Premium "badge" visible in dashboard header when the user is premium
