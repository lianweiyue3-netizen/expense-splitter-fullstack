import { GroupRole } from '@prisma/client';
import { fail, ok, parseRequestError } from '@/lib/api-response';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { assertGroupMember } from '@/server/services/group-access';
import { addGroupMemberSchema } from '@/server/validators/groups';

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
    const membership = await assertGroupMember(groupId, session.user.id);
    if (membership.role !== GroupRole.OWNER) {
      return fail('Only owners can add members', 403);
    }

    const payload = addGroupMemberSchema.parse(await request.json());
    const user = await prisma.user.findUnique({
      where: { email: payload.email.toLowerCase() }
    });

    if (!user) {
      return fail('No user found with that email', 404);
    }

    const created = await prisma.groupMember.upsert({
      where: {
        groupId_userId: {
          groupId,
          userId: user.id
        }
      },
      update: {
        role: payload.role
      },
      create: {
        groupId,
        userId: user.id,
        role: payload.role
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return ok({ member: created }, 201);
  } catch (error) {
    return fail(parseRequestError(error), 400);
  }
}
