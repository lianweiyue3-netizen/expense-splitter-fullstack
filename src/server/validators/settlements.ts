import { z } from 'zod';

export const createSettlementSchema = z.object({
  payerId: z.string().min(1),
  receiverId: z.string().min(1),
  amountMinor: z.number().int().positive(),
  currencyCode: z
    .string()
    .length(3)
    .transform((value) => value.toUpperCase()),
  settledAt: z.coerce.date(),
  note: z.string().max(500).optional()
});
