import { ActivityType } from '@prisma/client';
import { fail, ok } from '@/lib/api-response';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type Params = {
  params: Promise<{ token: string }>;
};

export async function POST(_: Request, context: Params) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return fail('Unauthorized', 401);
  }

  const { token } = await context.params;
  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite) {
    return fail('Invite not found', 404);
  }
  if (invite.acceptedAt) {
    return fail('Invite already used', 400);
  }
  if (invite.expiresAt < new Date()) {
    return fail('Invite expired', 400);
  }
  if (
    invite.email &&
    session.user.email?.toLowerCase() !== invite.email.toLowerCase()
  ) {
    return fail('This invite is for a different email', 403);
  }

  await prisma.$transaction(async (tx) => {
    await tx.groupMember.upsert({
      where: {
        groupId_userId: {
          groupId: invite.groupId,
          userId: session.user.id
        }
      },
      update: {},
      create: {
        groupId: invite.groupId,
        userId: session.user.id,
        role: invite.role
      }
    });

    await tx.invite.update({
      where: { id: invite.id },
      data: {
        acceptedById: session.user.id,
        acceptedAt: new Date()
      }
    });

    await tx.activity.create({
      data: {
        groupId: invite.groupId,
        actorId: session.user.id,
        type: ActivityType.INVITE_ACCEPTED,
        entityType: 'invite',
        entityId: invite.id
      }
    });
  });

  return ok({ groupId: invite.groupId });
}
