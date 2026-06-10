import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { createSettlementSchema } from "@/lib/schemas/settlement";
import { HttpError, fail, requireUser, round2 } from "@/lib/server/helpers";

export const runtime = "nodejs";

// POST /api/settlements — record that the signed-in user paid another member.
// The payment moves the payer's balance up and the recipient's down (a cash
// transfer is tracked as net contribution on each side's totalPaid).
export async function POST(req: Request) {
  try {
    const token = await requireUser(req);
    const { toUid, amount } = createSettlementSchema.parse(await req.json());
    if (toUid === token.uid) {
      throw new HttpError(400, "You can't settle with yourself.");
    }

    const adminDb = getAdminDb();
    const userSnap = await adminDb.collection("users").doc(token.uid).get();
    const houseId = userSnap.data()?.houseId as string | undefined;
    if (!houseId) throw new HttpError(400, "Join or create a house first.");

    const houseRef = adminDb.collection("houses").doc(houseId);
    const membersCol = houseRef.collection("members");
    const fromRef = membersCol.doc(token.uid);
    const toRef = membersCol.doc(toUid);
    const settlementRef = houseRef.collection("settlements").doc();
    const value = round2(amount);

    await adminDb.runTransaction(async (tx) => {
      const [fromSnap, toSnap] = await Promise.all([
        tx.get(fromRef),
        tx.get(toRef),
      ]);
      if (!fromSnap.exists) {
        throw new HttpError(403, "You're not a member of this house.");
      }
      if (!toSnap.exists) {
        throw new HttpError(400, "That member isn't in this house.");
      }

      const from = fromSnap.data() ?? {};
      const to = toSnap.data() ?? {};

      tx.set(settlementRef, {
        from: token.uid,
        fromName: from.displayName ?? "Boardmate",
        to: toUid,
        toName: to.displayName ?? "Boardmate",
        amount: value,
        createdAt: FieldValue.serverTimestamp(),
      });

      const fromPaid = round2((from.totalPaid ?? 0) + value);
      tx.update(fromRef, {
        totalPaid: fromPaid,
        balance: round2(fromPaid - (from.totalOwed ?? 0)),
      });

      const toPaid = round2((to.totalPaid ?? 0) - value);
      tx.update(toRef, {
        totalPaid: toPaid,
        balance: round2(toPaid - (to.totalOwed ?? 0)),
      });
    });

    return Response.json({ settlementId: settlementRef.id });
  } catch (err) {
    return fail(err);
  }
}
