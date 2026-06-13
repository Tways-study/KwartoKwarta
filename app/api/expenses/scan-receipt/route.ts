import { GoogleGenAI } from "@google/genai";
import { getAdminDb } from "@/lib/firebase/admin";
import { HttpError, fail, requireUser } from "@/lib/server/helpers";
import { isPremium } from "@/lib/utils/premium";
import type { ExpenseCategory } from "@/lib/firebase/schema";

export const runtime = "nodejs";

const VALID_CATEGORIES: ExpenseCategory[] = [
  "electric",
  "water",
  "internet",
  "grocery",
  "rent",
  "cleaning",
  "other",
];

// POST /api/expenses/scan-receipt — Gemini Vision receipt OCR (premium only).
// Accepts multipart/form-data with field "image". Returns partial expense prefill.
export async function POST(req: Request) {
  try {
    const token = await requireUser(req);

    const adminDb = getAdminDb();
    const userSnap = await adminDb.collection("users").doc(token.uid).get();
    if (!isPremium(userSnap.data()?.premiumUntil)) {
      throw new HttpError(403, "This feature requires a premium subscription.");
    }

    const form = await req.formData();
    const file = form.get("image");
    if (!(file instanceof File)) throw new HttpError(400, "No image provided.");

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const mimeType = file.type || "image/jpeg";

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { data: base64, mimeType } },
            {
              text: 'Extract the expense details from this receipt. Return ONLY valid JSON (no markdown) with these fields — omit fields you cannot determine: { "description": string, "amount": number, "category": one of ["electric","water","internet","grocery","rent","cleaning","other"], "date": "YYYY-MM-DD" }',
            },
          ],
        },
      ],
    });

    const raw = result.text ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return Response.json({});

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return Response.json({});
    }

    return Response.json({
      description:
        typeof parsed.description === "string" ? parsed.description : undefined,
      amount:
        typeof parsed.amount === "number" && parsed.amount > 0
          ? parsed.amount
          : undefined,
      category: VALID_CATEGORIES.includes(parsed.category as ExpenseCategory)
        ? (parsed.category as ExpenseCategory)
        : undefined,
      date:
        typeof parsed.date === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)
          ? parsed.date
          : undefined,
    });
  } catch (err) {
    return fail(err);
  }
}
