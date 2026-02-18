import { fail, ok, parseRequestError } from '@/lib/api-response';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { assertGroupMember } from '@/server/services/group-access';

type Params = {
  params: Promise<{ groupId: string }>;
};

export async function DELETE(request: Request, context: Params) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return fail('Unauthorized', 401);
  }

  const { groupId } = await context.params;
  try {
    await assertGroupMember(groupId, session.user.id);
    const body = (await request.json()) as { expenseIds?: string[] };
    const expenseIds = Array.isArray(body.expenseIds)
      ? body.expenseIds.filter(
          (id): id is string => typeof id === 'string' && id.length > 0
        )
      : [];

    if (expenseIds.length === 0) {
      return fail('No expense IDs provided', 400);
    }

    await prisma.expense.deleteMany({
      where: {
        groupId,
        id: { in: expenseIds }
      }
    });

    return ok({ success: true });
  } catch (error) {
    return fail(parseRequestError(error), 400);
  }
}
