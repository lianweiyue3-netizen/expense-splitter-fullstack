import { ActivityType } from '@prisma/client';
import { fail, ok, parseRequestError } from '@/lib/api-response';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildSplits, createExpenseSchema } from '@/server/domain/splits';
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

  const expenses = await prisma.expense.findMany({
    where: { groupId },
    include: { paidBy: true, splits: { include: { user: true } } },
    orderBy: { expenseDate: 'desc' }
  });

  return ok({ expenses });
}

export async function POST(request: Request, context: Params) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return fail('Unauthorized', 401);
  }

  const { groupId } = await context.params;
  try {
    await assertGroupMember(groupId, session.user.id);
    const payload = createExpenseSchema.parse(await request.json());
    const splits = buildSplits(payload);

    const groupMembers = await prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true }
    });
    const allowedUserIds = new Set(groupMembers.map((member) => member.userId));
    if (
      !allowedUserIds.has(payload.paidById) ||
      splits.some((split) => !allowedUserIds.has(split.userId))
    ) {
      return fail('All users must be members of the group', 400);
    }

    const expense = await prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          groupId,
          paidById: payload.paidById,
          amountMinor: payload.amountMinor,
          currencyCode: payload.currencyCode,
          expenseDate: payload.expenseDate,
          note: payload.note,
          splitType: payload.splitType
        }
      });

      await tx.expenseSplit.createMany({
        data: splits.map((split) => ({
          expenseId: created.id,
          userId: split.userId,
          amountMinor: split.amountMinor,
          percentageBps: split.percentageBps
        }))
      });

      await tx.activity.create({
        data: {
          groupId,
          actorId: session.user.id,
          type: ActivityType.EXPENSE_CREATED,
          entityType: 'expense',
          entityId: created.id,
          metadataJson: {
            amountMinor: payload.amountMinor,
            currencyCode: payload.currencyCode
          }
        }
      });

      return created;
    });

    return ok({ expense }, 201);
  } catch (error) {
    return fail(parseRequestError(error), 400);
  }
}
