import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { fail, requireUser } from "@/lib/server/helpers";

export const runtime = "nodejs";

// POST /api/premium/subscribe — mock: sets premiumUntil = now + 30 days on the user doc.
export async function POST(req: Request) {
  try {
    const token = await requireUser(req);

    const premiumUntil = Timestamp.fromMillis(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    );

    await getAdminDb()
      .collection("users")
      .doc(token.uid)
      .set({ premiumUntil }, { merge: true });

    return Response.json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
