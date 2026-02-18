import { SplitType } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { buildSplits } from '@/server/domain/splits';

describe('buildSplits', () => {
  it('splits equally with remainder distribution', () => {
    const splits = buildSplits({
      paidById: 'u1',
      amountMinor: 100,
      currencyCode: 'USD',
      expenseDate: new Date(),
      splitType: SplitType.EQUAL,
      participants: [{ userId: 'u1' }, { userId: 'u2' }, { userId: 'u3' }]
    });

    expect(splits.map((split) => split.amountMinor)).toEqual([34, 33, 33]);
  });

  it('validates custom total', () => {
    expect(() =>
      buildSplits({
        paidById: 'u1',
        amountMinor: 100,
        currencyCode: 'USD',
        expenseDate: new Date(),
        splitType: SplitType.CUSTOM_AMOUNT,
        participants: [
          { userId: 'u1', amountMinor: 60 },
          { userId: 'u2', amountMinor: 10 }
        ]
      })
    ).toThrowError(/sum to total amount/i);
  });

  it('validates percentage total', () => {
    expect(() =>
      buildSplits({
        paidById: 'u1',
        amountMinor: 100,
        currencyCode: 'USD',
        expenseDate: new Date(),
        splitType: SplitType.PERCENTAGE,
        participants: [
          { userId: 'u1', percentageBps: 4000 },
          { userId: 'u2', percentageBps: 4000 }
        ]
      })
    ).toThrowError(/100%/i);
  });
});
