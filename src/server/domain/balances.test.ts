import { describe, expect, it } from 'vitest';
import {
  calculateNetBalances,
  simplifyPayments
} from '@/server/domain/balances';

describe('calculateNetBalances', () => {
  it('computes balances across expenses and settlements', () => {
    const balances = calculateNetBalances(
      ['u1', 'u2', 'u3'],
      [
        {
          paidById: 'u1',
          splits: [
            { userId: 'u1', amountMinor: 3000 },
            { userId: 'u2', amountMinor: 3000 },
            { userId: 'u3', amountMinor: 3000 }
          ]
        }
      ],
      [{ payerId: 'u2', receiverId: 'u1', amountMinor: 1000 }]
    );

    expect(balances).toEqual(
      expect.arrayContaining([
        { memberId: 'u1', netMinor: 5000 },
        { memberId: 'u2', netMinor: -2000 },
        { memberId: 'u3', netMinor: -3000 }
      ])
    );
  });

  it('simplifies transfers', () => {
    const payments = simplifyPayments([
      { memberId: 'u1', netMinor: 5000 },
      { memberId: 'u2', netMinor: -2000 },
      { memberId: 'u3', netMinor: -3000 }
    ]);

    expect(payments).toEqual([
      { from: 'u3', to: 'u1', amountMinor: 3000 },
      { from: 'u2', to: 'u1', amountMinor: 2000 }
    ]);
  });
});
