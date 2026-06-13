import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { HttpError, fail, requireUser } from "@/lib/server/helpers";
import { createRecurringBillSchema } from "@/lib/schemas/recurringBill";
import { isPremium } from "@/lib/utils/premium";

export const runtime = "nodejs";

async function getPremiumHouseId(uid: string): Promise<string> {
  const adminDb = getAdminDb();
  const userSnap = await adminDb.collection("users").doc(uid).get();
  if (!isPremium(userSnap.data()?.premiumUntil)) {
    throw new HttpError(403, "This feature requires a premium subscription.");
  }
  const houseId = userSnap.data()?.houseId as string | undefined;
  if (!houseId) throw new HttpError(400, "Join or create a house first.");
  return houseId;
}

// POST /api/houses/recurring-bills — add a recurring bill (premium).
export async function POST(req: Request) {
  try {
    const token = await requireUser(req);
    const input = createRecurringBillSchema.parse(await req.json());
    const houseId = await getPremiumHouseId(token.uid);

    const ref = getAdminDb()
      .collection("houses")
      .doc(houseId)
      .collection("recurring_bills")
      .doc();

    await ref.set({
      ...input,
      cadence: "monthly",
      createdAt: FieldValue.serverTimestamp(),
    });

    return Response.json({ billId: ref.id });
  } catch (err) {
    return fail(err);
  }
}

// DELETE /api/houses/recurring-bills?billId=xxx — remove a bill (premium).
export async function DELETE(req: Request) {
  try {
    const token = await requireUser(req);
    const billId = new URL(req.url).searchParams.get("billId");
    if (!billId) throw new HttpError(400, "billId is required.");

    const houseId = await getPremiumHouseId(token.uid);

    await getAdminDb()
      .collection("houses")
      .doc(houseId)
      .collection("recurring_bills")
      .doc(billId)
      .delete();

    return Response.json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
