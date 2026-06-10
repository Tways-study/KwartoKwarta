import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { createHouseSchema } from "@/lib/schemas/house";
import {
  HttpError,
  fail,
  generateUniqueInviteCode,
  requireUser,
  resolveName,
} from "@/lib/server/helpers";

export const runtime = "nodejs";

// POST /api/houses — create a house + creator member + set users/{uid}.houseId
// atomically, and return { houseId, inviteCode } (§8.7, §10.2).
export async function POST(req: Request) {
  try {
    const token = await requireUser(req);
    const { name } = createHouseSchema.parse(await req.json());
    const inviteCode = await generateUniqueInviteCode();
    const adminDb = getAdminDb();

    const houseRef = adminDb.collection("houses").doc();
    const userRef = adminDb.collection("users").doc(token.uid);
    const memberRef = houseRef.collection("members").doc(token.uid);

    await adminDb.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      if (userSnap.exists && userSnap.data()?.houseId) {
        throw new HttpError(409, "You're already in a house. Leave it first.");
      }

      const displayName = resolveName(userSnap.data()?.displayName, token);
      const email = token.email ?? "";
      const photoURL = token.picture ?? null;

      tx.set(houseRef, {
        name,
        inviteCode,
        createdBy: token.uid,
        createdAt: FieldValue.serverTimestamp(),
        memberCount: 1,
      });
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
      tx.set(
        userRef,
        { houseId: houseRef.id, displayName, email, photoURL },
        { merge: true },
      );
    });

    return Response.json({ houseId: houseRef.id, inviteCode });
  } catch (err) {
    return fail(err);
  }
}
