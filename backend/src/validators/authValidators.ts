import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["admin", "user"]).optional()
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});
