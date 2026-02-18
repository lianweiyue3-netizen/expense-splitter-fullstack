import { ActivityType, SplitType } from '@prisma/client';
import { z } from 'zod';
import { fail, ok, parseRequestError } from '@/lib/api-response';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildSplits } from '@/server/domain/splits';
import { assertGroupMember } from '@/server/services/group-access';

const createRowSchema = z.object({
  paidById: z.string().min(1),
  amountMinor: z.number().int().positive(),
  currencyCode: z
    .string()
    .length(3)
    .transform((value) => value.toUpperCase()),
  expenseDate: z.coerce.date(),
  note: z.string().max(500).optional(),
  participants: z
    .array(
      z.object({
        userId: z.string().min(1),
        amountMinor: z.number().int().min(0)
      })
    )
    .min(1)
});

const replaceExpenseSchema = z.object({
  replaceExpenseIds: z.array(z.string().min(1)).min(1),
  rows: z.array(createRowSchema).min(1)
});

type Params = {
  params: Promise<{ groupId: string }>;
};

export async function POST(request: Request, context: Params) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return fail('Unauthorized', 401);
  }

  const { groupId } = await context.params;
  try {
    await assertGroupMember(groupId, session.user.id);
    const payload = replaceExpenseSchema.parse(await request.json());

    const groupMembers = await prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true }
    });
    const allowedUserIds = new Set(groupMembers.map((member) => member.userId));

    for (const row of payload.rows) {
      if (
        !allowedUserIds.has(row.paidById) ||
        row.participants.some((split) => !allowedUserIds.has(split.userId))
      ) {
        return fail('All users must be members of the group', 400);
      }
      const total = row.participants.reduce(
        (sum, split) => sum + split.amountMinor,
        0
      );
      if (total !== row.amountMinor) {
        return fail('Split amounts must match row amount', 400);
      }
    }

    const createdExpenses = await prisma.$transaction(async (tx) => {
      const existingCount = await tx.expense.count({
        where: {
          groupId,
          id: { in: payload.replaceExpenseIds }
        }
      });
      if (existingCount !== payload.replaceExpenseIds.length) {
        throw new Error(
          'Original expense record not found. Please refresh and try editing again.'
        );
      }

      const deleted = await tx.expense.deleteMany({
        where: {
          groupId,
          id: { in: payload.replaceExpenseIds }
        }
      });
      if (deleted.count !== payload.replaceExpenseIds.length) {
        throw new Error(
          'Failed to replace old expense records safely. Please try again.'
        );
      }

      const createdIds: string[] = [];
      for (const row of payload.rows) {
        const created = await tx.expense.create({
          data: {
            groupId,
            paidById: row.paidById,
            amountMinor: row.amountMinor,
            currencyCode: row.currencyCode,
            expenseDate: row.expenseDate,
            note: row.note,
            splitType: SplitType.CUSTOM_AMOUNT
          }
        });

        const splits = buildSplits({
          paidById: row.paidById,
          amountMinor: row.amountMinor,
          currencyCode: row.currencyCode,
          expenseDate: row.expenseDate,
          note: row.note,
          splitType: SplitType.CUSTOM_AMOUNT,
          participants: row.participants
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
              amountMinor: row.amountMinor,
              currencyCode: row.currencyCode
            }
          }
        });

        createdIds.push(created.id);
      }

      return createdIds;
    });

    return ok({ expenseIds: createdExpenses });
  } catch (error) {
    return fail(parseRequestError(error), 400);
  }
}
