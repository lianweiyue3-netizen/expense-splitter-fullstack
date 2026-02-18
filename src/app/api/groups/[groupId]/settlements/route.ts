import { ActivityType } from '@prisma/client';
import { fail, ok, parseRequestError } from '@/lib/api-response';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { assertGroupMember } from '@/server/services/group-access';
import { createSettlementSchema } from '@/server/validators/settlements';

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

  const settlements = await prisma.settlement.findMany({
    where: { groupId },
    include: { payer: true, receiver: true },
    orderBy: { settledAt: 'desc' }
  });
  return ok({ settlements });
}

export async function POST(request: Request, context: Params) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return fail('Unauthorized', 401);
  }

  const { groupId } = await context.params;
  try {
    await assertGroupMember(groupId, session.user.id);
    const payload = createSettlementSchema.parse(await request.json());

    if (payload.payerId === payload.receiverId) {
      return fail('Payer and receiver cannot be the same user', 400);
    }

    const membershipCount = await prisma.groupMember.count({
      where: {
        groupId,
        userId: { in: [payload.payerId, payload.receiverId] }
      }
    });
    if (membershipCount !== 2) {
      return fail('Both users must be group members', 400);
    }

    const settlement = await prisma.$transaction(async (tx) => {
      const created = await tx.settlement.create({
        data: {
          groupId,
          payerId: payload.payerId,
          receiverId: payload.receiverId,
          amountMinor: payload.amountMinor,
          currencyCode: payload.currencyCode,
          settledAt: payload.settledAt,
          note: payload.note
        }
      });

      await tx.activity.create({
        data: {
          groupId,
          actorId: session.user.id,
          type: ActivityType.SETTLEMENT_CREATED,
          entityType: 'settlement',
          entityId: created.id,
          metadataJson: {
            amountMinor: payload.amountMinor,
            currencyCode: payload.currencyCode
          }
        }
      });

      return created;
    });

    return ok({ settlement }, 201);
  } catch (error) {
    return fail(parseRequestError(error), 400);
  }
}
