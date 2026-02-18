import { randomBytes } from 'crypto';
import { ActivityType, GroupRole } from '@prisma/client';
import { fail, ok, parseRequestError } from '@/lib/api-response';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { assertGroupMember } from '@/server/services/group-access';
import { createInviteSchema } from '@/server/validators/groups';

type Params = {
  params: Promise<{ groupId: string }>;
};

export async function POST(request: Request, context: Params) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return fail('Unauthorized', 401);
    }

    const { groupId } = await context.params;
    const membership = await assertGroupMember(groupId, session.user.id);

    const payload = createInviteSchema.parse(await request.json());
    if (
      membership.role !== GroupRole.OWNER &&
      payload.role !== GroupRole.MEMBER
    ) {
      return fail('Members can only create member invites', 403);
    }

    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date(
      Date.now() + payload.expiresInHours * 60 * 60 * 1000
    );

    const invite = await prisma.invite.create({
      data: {
        groupId,
        token,
        createdById: session.user.id,
        email: payload.email?.toLowerCase(),
        role: payload.role,
        expiresAt
      }
    });

    await prisma.activity.create({
      data: {
        groupId,
        actorId: session.user.id,
        type: ActivityType.INVITE_CREATED,
        entityType: 'invite',
        entityId: invite.id
      }
    });

    const origin = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    return ok({
      invite,
      inviteLink: `${origin}/invites/${token}`
    });
  } catch (error) {
    return fail(parseRequestError(error), 400);
  }
}
