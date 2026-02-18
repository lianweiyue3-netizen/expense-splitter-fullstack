import { z } from 'zod';
import { fail, ok, parseRequestError } from '@/lib/api-response';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const updateProfileSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  defaultCurrencyCode: z
    .string()
    .length(3)
    .transform((value) => value.toUpperCase())
    .optional()
});

export async function PATCH(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return fail('Unauthorized', 401);
    }

    const body = updateProfileSchema.parse(await request.json());
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: body,
      select: { id: true, name: true, email: true, defaultCurrencyCode: true }
    });

    return ok({ user });
  } catch (error) {
    return fail(parseRequestError(error), 400);
  }
}
