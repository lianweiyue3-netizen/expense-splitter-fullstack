import { ActivityType } from '@prisma/client';
import { fail, ok, parseRequestError } from '@/lib/api-response';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { assertGroupMember } from '@/server/services/group-access';
import { createSettlementSchema } from '@/server/validators/settlements';

type Params = {
  params: Promise<{ groupId: string; settlementId: string }>;
};

export async function PATCH(request: Request, context: Params) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return fail('Unauthorized', 401);
  }

  const { groupId, settlementId } = await context.params;
  try {
    await assertGroupMember(groupId, session.user.id);
    const payload = createSettlementSchema.parse(await request.json());

    if (payload.payerId === payload.receiverId) {
      return fail('Payer and receiver cannot be the same user', 400);
    }

    const existing = await prisma.settlement.findUnique({
      where: { id: settlementId },
      select: { id: true, groupId: true }
    });
    if (!existing || existing.groupId !== groupId) {
      return fail('Settlement not found', 404);
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
      const updated = await tx.settlement.update({
        where: { id: settlementId },
        data: {
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
          entityId: updated.id,
          metadataJson: {
            amountMinor: payload.amountMinor,
            currencyCode: payload.currencyCode,
            action: 'updated'
          }
        }
      });

      return updated;
    });

    return ok({ settlement });
  } catch (error) {
    return fail(parseRequestError(error), 400);
  }
}

export async function DELETE(_: Request, context: Params) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return fail('Unauthorized', 401);
  }

  const { groupId, settlementId } = await context.params;
  try {
    await assertGroupMember(groupId, session.user.id);
    const existing = await prisma.settlement.findUnique({
      where: { id: settlementId },
      select: { id: true, groupId: true, amountMinor: true, currencyCode: true }
    });
    if (!existing || existing.groupId !== groupId) {
      return fail('Settlement not found', 404);
    }

    await prisma.$transaction(async (tx) => {
      await tx.settlement.delete({
        where: { id: settlementId }
      });

      await tx.activity.create({
        data: {
          groupId,
          actorId: session.user.id,
          type: ActivityType.SETTLEMENT_CREATED,
          entityType: 'settlement',
          entityId: settlementId,
          metadataJson: {
            amountMinor: existing.amountMinor,
            currencyCode: existing.currencyCode,
            action: 'deleted'
          }
        }
      });
    });

    return ok({ success: true });
  } catch (error) {
    return fail(parseRequestError(error), 400);
  }
}
