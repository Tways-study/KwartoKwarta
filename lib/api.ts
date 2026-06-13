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
