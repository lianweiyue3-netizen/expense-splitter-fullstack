import { ActivityType, GroupRole } from '@prisma/client';
import { fail, ok, parseRequestError } from '@/lib/api-response';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createGroupSchema } from '@/server/validators/groups';

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return fail('Unauthorized', 401);
  }

  const groups = await prisma.group.findMany({
    where: {
      members: { some: { userId: session.user.id } }
    },
    orderBy: { createdAt: 'desc' }
  });

  return ok({ groups });
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return fail('Unauthorized', 401);
    }

    const body = createGroupSchema.parse(await request.json());
    const createData = {
      name: body.name,
      baseCurrencyCode: body.baseCurrencyCode,
      iconUrl: body.iconUrl ?? '/group-default-icon.svg',
      createdById: session.user.id,
      members: {
        create: {
          userId: session.user.id,
          role: GroupRole.OWNER
        }
      }
    } as {
      name: string;
      baseCurrencyCode: string;
      createdById: string;
      members: {
        create: {
          userId: string;
          role: GroupRole;
        };
      };
      iconUrl?: string;
    };

    const group = await prisma.group.create({
      data: createData
    });

    await prisma.activity.create({
      data: {
        groupId: group.id,
        actorId: session.user.id,
        type: ActivityType.GROUP_CREATED,
        entityType: 'group',
        entityId: group.id
      }
    });

    return ok({ group }, 201);
  } catch (error) {
    return fail(parseRequestError(error), 400);
  }
}
