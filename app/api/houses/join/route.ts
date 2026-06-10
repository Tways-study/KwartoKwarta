import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { joinHouseSchema } from "@/lib/schemas/house";
import { HttpError, fail, requireUser, resolveName } from "@/lib/server/helpers";

export const runtime = "nodejs";

// POST /api/houses/join — join a house by its 6-char invite code. Returns
// { houseId } so the client can seed the dashboard before navigating (§10.2).
export async function POST(req: Request) {
  try {
    const token = await requireUser(req);
    const { inviteCode } = joinHouseSchema.parse(await req.json());
    const code = inviteCode.toUpperCase();
    const adminDb = getAdminDb();

    const match = await adminDb
      .collection("houses")
      .where("inviteCode", "==", code)
      .limit(1)
      .get();
    if (match.empty) {
      throw new HttpError(404, "No house found with that invite code.");
    }

    const houseRef = match.docs[0].ref;
    const userRef = adminDb.collection("users").doc(token.uid);
    const memberRef = houseRef.collection("members").doc(token.uid);

    await adminDb.runTransaction(async (tx) => {
      const [houseSnap, userSnap, memberSnap] = await Promise.all([
        tx.get(houseRef),
        tx.get(userRef),
        tx.get(memberRef),
      ]);

      if (!houseSnap.exists) {
        throw new HttpError(404, "That house no longer exists.");
      }
      const currentHouse = userSnap.data()?.houseId;
      if (currentHouse && currentHouse !== houseRef.id) {
        throw new HttpError(
          409,
          "You're already in another house. Leave it first.",
        );
      }

      const displayName = resolveName(userSnap.data()?.displayName, token);
      const email = token.email ?? "";
      const photoURL = token.picture ?? null;

      if (!memberSnap.exists) {
        tx.set(memberRef, {
          uid: token.uid,
          displayName,
          email,
          photoURL,
          joinedAt: FieldValue.serverTimestamp(),
          totalPaid: 0,
          totalOwed: 0,
          balance: 0,
        });
        tx.update(houseRef, { memberCount: FieldValue.increment(1) });
      }

      tx.set(
        userRef,
        { houseId: houseRef.id, displayName, email, photoURL },
        { merge: true },
      );
    });

    return Response.json({ houseId: houseRef.id });
  } catch (err) {
    return fail(err);
  }
}
