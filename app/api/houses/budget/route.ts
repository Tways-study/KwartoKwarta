import { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import { HttpError, fail, requireUser } from "@/lib/server/helpers";
import { isPremium } from "@/lib/utils/premium";

export const runtime = "nodejs";

const schema = z.object({
  amount: z.number().nonnegative("Budget must be 0 or more"),
});

// POST /api/houses/budget — set (or clear with 0) the house monthly budget.
// Premium-only. Server reads houseId from the user doc.
export async function POST(req: Request) {
  try {
    const token = await requireUser(req);
    const { amount } = schema.parse(await req.json());

    const adminDb = getAdminDb();
    const userSnap = await adminDb.collection("users").doc(token.uid).get();

    if (!isPremium(userSnap.data()?.premiumUntil)) {
      throw new HttpError(403, "This feature requires a premium subscription.");
    }

    const houseId = userSnap.data()?.houseId as string | undefined;
    if (!houseId) throw new HttpError(400, "Join or create a house first.");

    await adminDb.collection("houses").doc(houseId).update({ monthlyBudget: amount });

    return Response.json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
