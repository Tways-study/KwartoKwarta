"use client";

import { auth } from "@/lib/firebase/client";
import type { CreateExpenseInput } from "@/lib/schemas/expense";
import type { CreateSettlementInput } from "@/lib/schemas/settlement";

async function authedFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error("You're signed out. Please sign in again.");

  const token = await user.getIdToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
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
};
