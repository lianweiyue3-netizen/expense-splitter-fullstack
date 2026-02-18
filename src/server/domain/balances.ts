type ExpenseForBalance = {
  paidById: string;
  splits: Array<{ userId: string; amountMinor: number }>;
};

type SettlementForBalance = {
  payerId: string;
  receiverId: string;
  amountMinor: number;
};

export type MemberBalance = {
  memberId: string;
  netMinor: number;
};

export type PaymentEdge = {
  from: string;
  to: string;
  amountMinor: number;
};

export function calculateNetBalances(
  memberIds: string[],
  expenses: ExpenseForBalance[],
  settlements: SettlementForBalance[]
): MemberBalance[] {
  const netByMember = new Map(memberIds.map((id) => [id, 0]));

  for (const expense of expenses) {
    for (const split of expense.splits) {
      netByMember.set(
        split.userId,
        (netByMember.get(split.userId) ?? 0) - split.amountMinor
      );
      netByMember.set(
        expense.paidById,
        (netByMember.get(expense.paidById) ?? 0) + split.amountMinor
      );
    }
  }

  for (const settlement of settlements) {
    netByMember.set(
      settlement.payerId,
      (netByMember.get(settlement.payerId) ?? 0) + settlement.amountMinor
    );
    netByMember.set(
      settlement.receiverId,
      (netByMember.get(settlement.receiverId) ?? 0) - settlement.amountMinor
    );
  }

  return Array.from(netByMember.entries()).map(([memberId, netMinor]) => ({
    memberId,
    netMinor
  }));
}

export function simplifyPayments(balances: MemberBalance[]): PaymentEdge[] {
  const creditors = balances
    .filter((balance) => balance.netMinor > 0)
    .map((balance) => ({ ...balance }))
    .sort((a, b) => b.netMinor - a.netMinor);
  const debtors = balances
    .filter((balance) => balance.netMinor < 0)
    .map((balance) => ({
      memberId: balance.memberId,
      netMinor: Math.abs(balance.netMinor)
    }))
    .sort((a, b) => b.netMinor - a.netMinor);

  const edges: PaymentEdge[] = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    const amount = Math.min(creditor.netMinor, debtor.netMinor);

    edges.push({
      from: debtor.memberId,
      to: creditor.memberId,
      amountMinor: amount
    });

    creditor.netMinor -= amount;
    debtor.netMinor -= amount;

    if (creditor.netMinor === 0) {
      creditorIndex += 1;
    }
    if (debtor.netMinor === 0) {
      debtorIndex += 1;
    }
  }

  return edges;
}
