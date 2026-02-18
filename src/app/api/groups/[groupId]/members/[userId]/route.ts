import { GroupRole } from '@prisma/client';
import { fail, ok, parseRequestError } from '@/lib/api-response';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { assertGroupMember } from '@/server/services/group-access';

type Params = {
  params: Promise<{ groupId: string; userId: string }>;
};

export async function DELETE(_: Request, context: Params) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return fail('Unauthorized', 401);
  }

  const { groupId, userId } = await context.params;
  try {
    const membership = await assertGroupMember(groupId, session.user.id);
    if (membership.role !== GroupRole.OWNER) {
      return fail('Only owners can remove members', 403);
    }

    const memberToRemove = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId
        }
      }
    });

    if (!memberToRemove) {
      return fail('Member not found', 404);
    }

    const totalMembers = await prisma.groupMember.count({ where: { groupId } });
    if (totalMembers <= 1) {
      return fail('Cannot remove the last member', 400);
    }

    if (memberToRemove.role === GroupRole.OWNER) {
      const ownerCount = await prisma.groupMember.count({
        where: { groupId, role: GroupRole.OWNER }
      });
      if (ownerCount <= 1) {
        return fail('Cannot remove the only owner', 400);
      }
    }

    await prisma.groupMember.delete({
      where: {
        groupId_userId: {
          groupId,
          userId
        }
      }
    });

    return ok({ success: true });
  } catch (error) {
    return fail(parseRequestError(error), 400);
  }
}
