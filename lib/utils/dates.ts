import { format, isValid, parseISO } from "date-fns";
import type { FsTimestamp } from "@/lib/firebase/schema";

/** Convert a Firestore timestamp (or anything date-like) to a Date, safely. */
export function toDate(value: FsTimestamp | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  if (typeof value.toDate === "function") {
    const d = value.toDate();
    return isValid(d) ? d : null;
  }
  if (typeof value.seconds === "number") {
    const d = new Date(value.seconds * 1000);
    return isValid(d) ? d : null;
  }
  return null;
}

// §10.8 — <input type="date"> needs yyyy-MM-dd; guard so an empty/partial value
// never throws "RangeError: Invalid time value".
export function toDateInputValue(date: Date | null | undefined): string {
  if (!date || !isValid(date)) return "";
  return format(date, "yyyy-MM-dd");
}

export function fromDateInputValue(value: string): Date | null {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

export function formatDate(value: FsTimestamp | Date | null | undefined): string {
  const d = toDate(value);
  return d ? format(d, "MMM d, yyyy") : "—";
}

export function formatDayMonth(value: FsTimestamp | Date | null | undefined): string {
  const d = toDate(value);
  return d ? format(d, "MMM d") : "—";
}

export function monthKey(date: Date): string {
  return format(date, "yyyy-MM");
}

export function monthLabel(date: Date): string {
  return format(date, "MMMM yyyy");
}
