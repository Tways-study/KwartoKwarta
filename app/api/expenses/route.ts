import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { isValid } from "date-fns";
import { getAdminDb } from "@/lib/firebase/admin";
import { createExpenseSchema } from "@/lib/schemas/expense";
import { HttpError, fail, requireUser, round2 } from "@/lib/server/helpers";

export const runtime = "nodejs";

// POST /api/expenses — add an expense and update affected member balances in a
// single transaction. balance = totalPaid - totalOwed (positive = owed back).
export async function POST(req: Request) {
  try {
    const token = await requireUser(req);
    const input = createExpenseSchema.parse(await req.json());

    const date = new Date(input.date);
    if (!isValid(date)) throw new HttpError(400, "That date isn't valid.");

    const splitSum = round2(
      Object.values(input.splits).reduce((a, b) => a + b, 0),
    );
    if (Math.abs(splitSum - round2(input.amount)) > 0.01) {
      throw new HttpError(400, "Splits must add up to the total amount.");
    }

    const adminDb = getAdminDb();
    const userSnap = await adminDb.collection("users").doc(token.uid).get();
    const houseId = userSnap.data()?.houseId as string | undefined;
    if (!houseId) throw new HttpError(400, "Join or create a house first.");

    const houseRef = adminDb.collection("houses").doc(houseId);
    const membersCol = houseRef.collection("members");
    const expenseRef = houseRef.collection("expenses").doc();

    // The payer and everyone in the split are the members we touch.
    const affected = Array.from(
      new Set([input.paidBy, ...Object.keys(input.splits)]),
    );

    await adminDb.runTransaction(async (tx) => {
      const payerMembership = await tx.get(membersCol.doc(token.uid));
      if (!payerMembership.exists) {
        throw new HttpError(403, "You're not a member of this house.");
      }

      const snaps = await Promise.all(
        affected.map((uid) => tx.get(membersCol.doc(uid))),
      );
      const data: Record<string, FirebaseFirestore.DocumentData> = {};
      snaps.forEach((snap, i) => {
        if (!snap.exists) {
          throw new HttpError(400, "A selected member isn't in this house.");
        }
        data[affected[i]] = snap.data() ?? {};
      });

      const paidByName = data[input.paidBy].displayName ?? "Boardmate";

      tx.set(expenseRef, {
        description: input.description,
        amount: round2(input.amount),
        paidBy: input.paidBy,
        paidByName,
        splitType: input.splitType,
        splits: input.splits,
        category: input.category,
        date: Timestamp.fromDate(date),
        createdAt: FieldValue.serverTimestamp(),
        settled: false,
      });

      for (const uid of affected) {
        const m = data[uid];
        const paidDelta = uid === input.paidBy ? round2(input.amount) : 0;
        const owedDelta = round2(input.splits[uid] ?? 0);
        const totalPaid = round2((m.totalPaid ?? 0) + paidDelta);
        const totalOwed = round2((m.totalOwed ?? 0) + owedDelta);
        tx.update(membersCol.doc(uid), {
          totalPaid,
          totalOwed,
          balance: round2(totalPaid - totalOwed),
        });
      }
    });

    return Response.json({ expenseId: expenseRef.id });
  } catch (err) {
    return fail(err);
  }
}
