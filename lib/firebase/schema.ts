/**
 * KwartoKwarta Firestore data model (guide §4).
 *
 * Architecture (§3): reads are client-side `onSnapshot`; ALL writes go through
 * Next API routes using the Admin SDK. Security rules make every doc read-only
 * for clients (`allow write: if false`). Balances are denormalized onto member
 * docs and updated transactionally on each expense/settlement write.
 *
 *   /users/{uid}
 *   /houses/{houseId}
 *   /houses/{houseId}/members/{uid}
 *   /houses/{houseId}/expenses/{expenseId}
 *   /houses/{houseId}/settlements/{settlementId}
 */

export type ExpenseCategory =
  | "electric"
  | "water"
  | "internet"
  | "grocery"
  | "rent"
  | "cleaning"
  | "other";

export type SplitType = "equal" | "custom";

/** Minimal shape shared by client (`Timestamp`) and `{ seconds }` server values. */
export interface FsTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
}

export interface UserDoc {
  displayName: string;
  email: string;
  photoURL: string | null;
  houseId: string | null;
  createdAt: FsTimestamp;
}

export interface HouseDoc {
  name: string;
  inviteCode: string;
  createdBy: string;
  createdAt: FsTimestamp;
  memberCount: number;
}

export interface MemberDoc {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  joinedAt: FsTimestamp;
  totalPaid: number;
  totalOwed: number;
  balance: number; // totalPaid - totalOwed (positive = owed money back)
}

export interface ExpenseDoc {
  description: string;
  amount: number;
  paidBy: string;
  paidByName: string;
  splitType: SplitType;
  splits: Record<string, number>; // uid -> amount owed for this expense
  category: ExpenseCategory;
  date: FsTimestamp;
  createdAt: FsTimestamp;
  settled: boolean;
}

export interface SettlementDoc {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
  createdAt: FsTimestamp;
}

/** Doc shapes as consumed by hooks (id + data). */
export type WithId<T> = T & { id: string };
export type House = WithId<HouseDoc>;
export type Member = WithId<MemberDoc>;
export type Expense = WithId<ExpenseDoc>;
export type Settlement = WithId<SettlementDoc>;
