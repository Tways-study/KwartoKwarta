import { z } from "zod";

export const EXPENSE_CATEGORIES = [
  "electric",
  "water",
  "internet",
  "grocery",
  "rent",
  "cleaning",
  "other",
] as const;

export const createExpenseSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "Add a short description")
    .max(100, "Keep it under 100 characters"),
  amount: z.number().positive("Amount must be greater than 0").max(10_000_000),
  paidBy: z.string().min(1, "Choose who paid"),
  category: z.enum(EXPENSE_CATEGORIES),
  splitType: z.enum(["equal", "custom"]),
  // uid -> amount owed for this expense
  splits: z.record(z.string(), z.number().nonnegative()),
  // ISO date string (yyyy-MM-dd or full ISO); the route converts to a Timestamp
  date: z.string().min(1, "Pick a date"),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
