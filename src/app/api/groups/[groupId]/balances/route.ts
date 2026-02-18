import { fail, ok } from '@/lib/api-response';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  calculateNetBalances,
  simplifyPayments
} from '@/server/domain/balances';
import { assertGroupMember } from '@/server/services/group-access';

type Params = {
  params: Promise<{ groupId: string }>;
};

export async function GET(_: Request, context: Params) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return fail('Unauthorized', 401);
  }
  const { groupId } = await context.params;

  try {
    await assertGroupMember(groupId, session.user.id);
  } catch {
    return fail('Forbidden', 403);
  }

  const [members, expenses, settlements, group] = await Promise.all([
    prisma.groupMember.findMany({
      where: { groupId },
      include: { user: true }
    }),
    prisma.expense.findMany({
      where: { groupId },
      include: { splits: true }
    }),
    prisma.settlement.findMany({ where: { groupId } }),
    prisma.group.findUnique({
      where: { id: groupId },
      select: { baseCurrencyCode: true }
    })
  ]);

  const balances = calculateNetBalances(
    members.map((member) => member.userId),
    expenses.map((expense) => ({
      paidById: expense.paidById,
      splits: expense.splits.map((split) => ({
        userId: split.userId,
        amountMinor: split.amountMinor ?? 0
      }))
    })),
    settlements.map((settlement) => ({
      payerId: settlement.payerId,
      receiverId: settlement.receiverId,
      amountMinor: settlement.amountMinor
    }))
  );

  const balanceUserIds = Array.from(
    new Set(balances.map((balance) => balance.memberId))
  );
  const users = await prisma.user.findMany({
    where: { id: { in: balanceUserIds } },
    select: { id: true, name: true }
  });
  const nameById = new Map(users.map((user) => [user.id, user.name]));

  const payments = simplifyPayments(balances);

  return ok({
    currencyCode: group?.baseCurrencyCode ?? 'USD',
    balances: balances.map((balance) => ({
      ...balance,
      name: nameById.get(balance.memberId) ?? balance.memberId
    })),
    payments
  });
}
