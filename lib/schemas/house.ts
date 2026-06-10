import { z } from "zod";

export const createHouseSchema = z.object({
  name: z.string().trim().min(1, "Name your house").max(50, "Keep it under 50 characters"),
});

export const joinHouseSchema = z.object({
  inviteCode: z
    .string()
    .trim()
    .min(6, "Invite codes are 6 characters")
    .max(6, "Invite codes are 6 characters"),
});

export type CreateHouseInput = z.infer<typeof createHouseSchema>;
export type JoinHouseInput = z.infer<typeof joinHouseSchema>;
