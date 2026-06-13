"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Expense, House, Member, RecurringBill, Settlement, UserDoc } from "@/lib/firebase/schema";

// §10.1 — every loading gate must have an error/timeout branch so one slow or
// failed read can never become an infinite spinner.
const TIMEOUT_MS = 10_000;

export interface DocState<T> {
  data: T | null;
  loading: boolean;
  error: boolean;
  notFound: boolean;
}

export interface ListState<T> {
  data: T[];
  loading: boolean;
  error: boolean;
}

function useDoc<T>(path: readonly string[] | null): DocState<T> {
  const key = path ? path.join("/") : null;
  const [state, setState] = useState<DocState<T>>(() => ({
    data: null,
    loading: !!key,
    error: false,
    notFound: false,
  }));

  // Reset synchronously at render time when the target doc changes (rather than
  // inside the effect, which would cause a cascading render).
  const [trackedKey, setTrackedKey] = useState(key);
  if (key !== trackedKey) {
    setTrackedKey(key);
    setState({ data: null, loading: !!key, error: false, notFound: false });
  }

  useEffect(() => {
    if (!key) return;

    const segments = key.split("/");
    const ref = doc(db, segments[0], ...segments.slice(1));
    const timer = setTimeout(() => {
      setState((s) => (s.loading ? { ...s, loading: false, error: true } : s));
    }, TIMEOUT_MS);

    const unsub = onSnapshot(
      ref,
      (snap) => {
        clearTimeout(timer);
        if (!snap.exists()) {
          // §10.1 — a cache miss for a freshly server-created doc is NOT a real
          // 404. Only treat it as notFound when it didn't come from cache.
          setState({
            data: null,
            loading: false,
            error: false,
            notFound: !snap.metadata.fromCache,
          });
          return;
        }
        setState({
          data: { id: snap.id, ...snap.data() } as T,
          loading: false,
          error: false,
          notFound: false,
        });
      },
      () => {
        clearTimeout(timer);
        setState({ data: null, loading: false, error: true, notFound: false });
      },
    );

    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [key]);

  return state;
}

function useCollection<T>(
  houseId: string | null,
  sub: string,
  orderField: string,
  dir: "asc" | "desc",
): ListState<T> {
  const [state, setState] = useState<ListState<T>>(() => ({
    data: [],
    loading: !!houseId,
    error: false,
  }));

  const [trackedHouse, setTrackedHouse] = useState(houseId);
  if (houseId !== trackedHouse) {
    setTrackedHouse(houseId);
    setState({ data: [], loading: !!houseId, error: false });
  }

  useEffect(() => {
    if (!houseId) return;

    const q = query(
      collection(db, "houses", houseId, sub),
      orderBy(orderField, dir),
    );
    const timer = setTimeout(() => {
      setState((s) => (s.loading ? { ...s, loading: false, error: true } : s));
    }, TIMEOUT_MS);

    const unsub = onSnapshot(
      q,
      (snap) => {
        clearTimeout(timer);
        setState({
          data: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T),
          loading: false,
          error: false,
        });
      },
      () => {
        clearTimeout(timer);
        setState({ data: [], loading: false, error: true });
      },
    );

    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [houseId, sub, orderField, dir]);

  return state;
}

export function useHouse(houseId: string | null): DocState<House> {
  return useDoc<House>(houseId ? ["houses", houseId] : null);
}

export function useMembers(houseId: string | null): ListState<Member> {
  return useCollection<Member>(houseId, "members", "joinedAt", "asc");
}

export function useExpenses(houseId: string | null): ListState<Expense> {
  return useCollection<Expense>(houseId, "expenses", "date", "desc");
}

export function useSettlements(houseId: string | null): ListState<Settlement> {
  return useCollection<Settlement>(houseId, "settlements", "createdAt", "desc");
}

export function useUserDoc(uid: string | null): DocState<UserDoc> {
  return useDoc<UserDoc>(uid ? ["users", uid] : null);
}

export function useRecurringBills(houseId: string | null): ListState<RecurringBill> {
  return useCollection<RecurringBill>(houseId, "recurring_bills", "createdAt", "asc");
}
