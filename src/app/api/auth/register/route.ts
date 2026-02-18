import bcrypt from 'bcryptjs';
import { fail, ok, parseRequestError } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { isRateLimited } from '@/lib/rate-limit';
import { registerSchema } from '@/server/validators/auth';

export async function POST(request: Request) {
  try {
    const body = registerSchema.parse(await request.json());
    if (isRateLimited(`register:${body.email}`, 6, 60_000)) {
      return fail('Too many signup attempts, try again later', 429);
    }

    const existing = await prisma.user.findUnique({
      where: { email: body.email }
    });
    if (existing) {
      return fail('Email already in use', 409);
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        name: body.name
      },
      select: { id: true, email: true, name: true }
    });

    return ok({ user }, 201);
  } catch (error) {
    return fail(parseRequestError(error), 400);
  }
}
