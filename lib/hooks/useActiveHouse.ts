"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

const KEY = "kk_houseId";

export function readStoredHouseId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY);
}
export function storeHouseId(id: string): void {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, id);
}
export function clearStoredHouseId(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
}

export interface ActiveHouseState {
  houseId: string | null;
  /** user doc has been read from the server (not just cache) */
  resolved: boolean;
  /** confirmed (server read): the user belongs to no house */
  noHouse: boolean;
  error: boolean;
}

/**
 * Resolves the user's active house. §10.2 — seeds `houseId` synchronously from
 * localStorage (written by the create/join API response before navigation) so
 * the dashboard renders immediately instead of stalling on the Listen stream.
 * The /users/{uid} listener then confirms/updates it. A `null` houseId is only
 * treated as "no house" on a real server read (`!fromCache`), never on a cache
 * miss for a just-created doc.
 */
export function useActiveHouse(uid: string | null): ActiveHouseState {
  const [houseId, setHouseId] = useState<string | null>(() =>
    readStoredHouseId(),
  );
  const [resolved, setResolved] = useState(false);
  const [noHouse, setNoHouse] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!uid) return;

    const ref = doc(db, "users", uid);
    const timer = setTimeout(() => setError(true), 10_000);

    const unsub = onSnapshot(
      ref,
      (snap) => {
        const fromCache = snap.metadata.fromCache;
        const hid = snap.exists()
          ? ((snap.data().houseId as string | null) ?? null)
          : null;

        if (hid) {
          clearTimeout(timer);
          setHouseId(hid);
          storeHouseId(hid);
          setNoHouse(false);
          setError(false);
          setResolved(!fromCache);
        } else if (!fromCache) {
          // Confirmed by the server: this user has no house.
          clearTimeout(timer);
          setHouseId(null);
          clearStoredHouseId();
          setNoHouse(true);
          setError(false);
          setResolved(true);
        }
        // hid null but fromCache: don't act — wait for the server read (§10.2).
      },
      () => {
        clearTimeout(timer);
        setError(true);
      },
    );

    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [uid]);

  return { houseId, resolved, noHouse, error };
}
