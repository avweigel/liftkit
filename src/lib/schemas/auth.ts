import { z } from "zod";

export const emailSchema = z.object({
  email: z.string().email("enter a valid email"),
});

export type EmailInput = z.infer<typeof emailSchema>;
