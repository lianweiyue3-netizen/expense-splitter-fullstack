import { SplitType } from '@prisma/client';
import { z } from 'zod';

const participantSchema = z.object({
  userId: z.string().min(1),
  amountMinor: z.number().int().positive().optional(),
  percentageBps: z.number().int().min(0).max(10_000).optional()
});

export const createExpenseSchema = z.object({
  paidById: z.string().min(1),
  amountMinor: z.number().int().positive(),
  currencyCode: z
    .string()
    .length(3)
    .transform((value) => value.toUpperCase()),
  expenseDate: z.coerce.date(),
  note: z.string().max(500).optional(),
  splitType: z.nativeEnum(SplitType),
  participants: z.array(participantSchema).min(1)
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

export function buildSplits(
  input: CreateExpenseInput
): Array<{ userId: string; amountMinor: number; percentageBps?: number }> {
  const { splitType, participants, amountMinor } = input;

  if (splitType === SplitType.EQUAL) {
    const base = Math.floor(amountMinor / participants.length);
    let remainder = amountMinor % participants.length;

    return participants.map((participant) => {
      const extra = remainder > 0 ? 1 : 0;
      remainder = Math.max(0, remainder - 1);
      return {
        userId: participant.userId,
        amountMinor: base + extra
      };
    });
  }

  if (splitType === SplitType.CUSTOM_AMOUNT) {
    const total = participants.reduce(
      (sum, participant) => sum + (participant.amountMinor ?? 0),
      0
    );
    if (total !== amountMinor) {
      throw new Error('Custom split amounts must sum to total amount');
    }

    return participants.map((participant) => ({
      userId: participant.userId,
      amountMinor: participant.amountMinor ?? 0
    }));
  }

  const totalBps = participants.reduce(
    (sum, participant) => sum + (participant.percentageBps ?? 0),
    0
  );
  if (totalBps !== 10_000) {
    throw new Error('Percentage splits must sum to 100%');
  }

  const results: Array<{
    userId: string;
    amountMinor: number;
    percentageBps: number;
  }> = [];
  let assigned = 0;
  for (let index = 0; index < participants.length; index += 1) {
    const participant = participants[index];
    const percentageBps = participant.percentageBps ?? 0;
    const isLast = index === participants.length - 1;
    const value = isLast
      ? amountMinor - assigned
      : Math.floor((amountMinor * percentageBps) / 10_000);
    assigned += value;
    results.push({
      userId: participant.userId,
      amountMinor: value,
      percentageBps
    });
  }

  return results;
}
