import "server-only";

import { ZodError } from "zod";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** Verify the `Authorization: Bearer <idToken>` header (guide §3, §8.7). */
export async function requireUser(req: Request): Promise<DecodedIdToken> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    throw new HttpError(401, "You're signed out. Please sign in again.");
  }
  try {
    return await getAdminAuth().verifyIdToken(token);
  } catch {
    throw new HttpError(401, "Your session has expired. Please sign in again.");
  }
}

/** Resolve a friendly display name for a member doc. */
export function resolveName(
  userDocName: unknown,
  token: DecodedIdToken,
): string {
  if (typeof userDocName === "string" && userDocName.trim()) return userDocName;
  if (token.name) return token.name;
  return token.email?.split("@")[0] || "Boardmate";
}

/** Translate thrown errors into JSON responses with sensible status codes. */
export function fail(err: unknown): Response {
  if (err instanceof HttpError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof ZodError) {
    const first = err.issues[0]?.message ?? "Invalid request.";
    return Response.json({ error: first }, { status: 400 });
  }
  console.error("[api] unhandled error:", err);
  return Response.json(
    { error: "Something went wrong. Please try again." },
    { status: 500 },
  );
}

// Crockford-ish alphabet: no ambiguous 0/O/1/I to keep codes easy to read aloud.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

export async function generateUniqueInviteCode(): Promise<string> {
  const adminDb = getAdminDb();
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = randomCode();
    const existing = await adminDb
      .collection("houses")
      .where("inviteCode", "==", code)
      .limit(1)
      .get();
    if (existing.empty) return code;
  }
  throw new HttpError(500, "Couldn't generate an invite code. Please try again.");
}

export const round2 = (n: number) => Math.round(n * 100) / 100;
