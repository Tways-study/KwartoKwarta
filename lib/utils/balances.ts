import type { Member } from "@/lib/firebase/schema";

export interface Transfer {
  fromUid: string;
  fromName: string;
  toUid: string;
  toName: string;
  amount: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const EPS = 0.01;

/**
 * Greedy debt simplification: matches the largest debtor against the largest
 * creditor until everyone nets to ~zero, minimizing the number of transfers.
 * Operates on the denormalized `balance` (positive = owed money back).
 */
export function simplifyDebts(members: Member[]): Transfer[] {
  const debtors = members
    .map((m) => ({ m, amt: round2(-m.balance) }))
    .filter((x) => x.amt > EPS)
    .sort((a, b) => b.amt - a.amt);

  const creditors = members
    .map((m) => ({ m, amt: round2(m.balance) }))
    .filter((x) => x.amt > EPS)
    .sort((a, b) => b.amt - a.amt);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const pay = round2(Math.min(debtors[i].amt, creditors[j].amt));
    if (pay > EPS) {
      transfers.push({
        fromUid: debtors[i].m.uid,
        fromName: debtors[i].m.displayName,
        toUid: creditors[j].m.uid,
        toName: creditors[j].m.displayName,
        amount: pay,
      });
    }
    debtors[i].amt = round2(debtors[i].amt - pay);
    creditors[j].amt = round2(creditors[j].amt - pay);
    if (debtors[i].amt <= EPS) i += 1;
    if (creditors[j].amt <= EPS) j += 1;
  }

  return transfers;
}
