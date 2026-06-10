import { z } from "zod";

// `from` is always the authenticated user (server-derived), so the body only
// carries the recipient and amount.
export const createSettlementSchema = z.object({
  toUid: z.string().min(1, "Choose who you're paying"),
  amount: z.number().positive("Amount must be greater than 0").max(10_000_000),
});

export type CreateSettlementInput = z.infer<typeof createSettlementSchema>;
