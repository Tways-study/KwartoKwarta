import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { HttpError, fail, requireUser } from "@/lib/server/helpers";

export const runtime = "nodejs";

// POST /api/houses/leave — remove the user from their current house.
export async function POST(req: Request) {
  try {
    const token = await requireUser(req);
    const adminDb = getAdminDb();
    const userRef = adminDb.collection("users").doc(token.uid);

    const userSnap = await userRef.get();
    const houseId = userSnap.data()?.houseId as string | undefined;
    if (!houseId) {
      throw new HttpError(400, "You're not in a house.");
    }

    const houseRef = adminDb.collection("houses").doc(houseId);
    const memberRef = houseRef.collection("members").doc(token.uid);

    await adminDb.runTransaction(async (tx) => {
      const [houseSnap, memberSnap] = await Promise.all([
        tx.get(houseRef),
        tx.get(memberRef),
      ]);

      if (memberSnap.exists) {
        tx.delete(memberRef);
        if (houseSnap.exists) {
          const nextCount = (houseSnap.data()?.memberCount ?? 1) - 1;
          tx.update(houseRef, {
            memberCount: nextCount > 0 ? FieldValue.increment(-1) : 0,
          });
        }
      }
      tx.update(userRef, { houseId: null });
    });

    return Response.json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
