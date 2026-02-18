import { GroupRole } from '@prisma/client';
import { z } from 'zod';

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const groupIconSchema = z
  .string()
  .max(2_000_000)
  .refine(
    (value) => value.startsWith('/') || value.startsWith('data:image/'),
    'Invalid group icon format'
  );

export const createGroupSchema = z.object({
  name: z.string().min(1).max(80),
  baseCurrencyCode: z
    .string()
    .length(3)
    .transform((value) => value.toUpperCase()),
  iconUrl: groupIconSchema.optional()
});

export const updateGroupSchema = z
  .object({
    name: z.string().min(1).max(80).optional(),
    baseCurrencyCode: z
      .string()
      .length(3)
      .transform((value) => value.toUpperCase())
      .optional(),
    iconUrl: groupIconSchema.optional(),
    tripStartDate: dateOnlySchema.optional(),
    tripEndDate: dateOnlySchema.nullable().optional()
  })
  .refine(
    (value) => {
      if (!value.tripStartDate || !value.tripEndDate) {
        return true;
      }
      return value.tripEndDate >= value.tripStartDate;
    },
    {
      message: 'Trip end date is invalid',
      path: ['tripEndDate']
    }
  );

export const createInviteSchema = z.object({
  email: z.string().email().optional(),
  role: z.nativeEnum(GroupRole).default(GroupRole.MEMBER),
  expiresInHours: z.number().int().min(1).max(168).default(72)
});

export const addGroupMemberSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(GroupRole).default(GroupRole.MEMBER)
});
