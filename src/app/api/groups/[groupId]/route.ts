import { fail, ok, parseRequestError } from '@/lib/api-response';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { assertGroupMember } from '@/server/services/group-access';
import { updateGroupSchema } from '@/server/validators/groups';

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

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: { user: true }
      }
    }
  });

  if (!group) {
    return fail('Group not found', 404);
  }

  return ok({ group });
}

export async function PATCH(request: Request, context: Params) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return fail('Unauthorized', 401);
  }

  const { groupId } = await context.params;
  try {
    const membership = await assertGroupMember(groupId, session.user.id);
    if (membership.role !== 'OWNER') {
      return fail('Only owners can update group settings', 403);
    }

    const body = updateGroupSchema.parse(await request.json());
    const data: {
      name?: string;
      baseCurrencyCode?: string;
      iconUrl?: string;
      tripStartDate?: Date;
      tripEndDate?: Date | null;
    } = {};

    if (body.name !== undefined) {
      data.name = body.name;
    }
    if (body.baseCurrencyCode !== undefined) {
      data.baseCurrencyCode = body.baseCurrencyCode;
    }
    if (body.iconUrl !== undefined) {
      data.iconUrl = body.iconUrl;
    }
    if (body.tripStartDate !== undefined) {
      data.tripStartDate = new Date(`${body.tripStartDate}T00:00:00.000Z`);
    }
    if (body.tripEndDate !== undefined) {
      data.tripEndDate = body.tripEndDate
        ? new Date(`${body.tripEndDate}T00:00:00.000Z`)
        : null;
    }

    const group = await prisma.group.update({
      where: { id: groupId },
      data
    });

    return ok({ group });
  } catch (error) {
    return fail(parseRequestError(error), 400);
  }
}

export async function DELETE(_: Request, context: Params) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return fail('Unauthorized', 401);
  }

  const { groupId } = await context.params;
  try {
    const membership = await assertGroupMember(groupId, session.user.id);
    if (membership.role !== 'OWNER') {
      return fail('Only owners can delete a group', 403);
    }

    await prisma.group.delete({
      where: { id: groupId }
    });

    return ok({ success: true });
  } catch (error) {
    return fail(parseRequestError(error), 400);
  }
}
