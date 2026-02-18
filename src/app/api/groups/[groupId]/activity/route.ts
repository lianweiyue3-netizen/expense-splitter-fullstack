import { fail, ok } from '@/lib/api-response';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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

  const activities = await prisma.activity.findMany({
    where: { groupId },
    include: { actor: true },
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  return ok({ activities });
}
