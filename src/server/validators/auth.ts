import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(72),
  name: z.string().trim().min(1).max(80)
});
