import { z } from "zod";
import { EXPENSE_CATEGORIES } from "@/lib/schemas/expense";

export const createRecurringBillSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Add a label")
    .max(80, "Keep it under 80 characters"),
  amount: z.number().positive("Amount must be greater than 0").max(10_000_000),
  category: z.enum(EXPENSE_CATEGORIES),
  splits: z.record(z.string(), z.number().nonnegative()),
});

export type CreateRecurringBillInput = z.infer<typeof createRecurringBillSchema>;
