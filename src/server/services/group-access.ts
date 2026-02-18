import { GroupRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function assertGroupMember(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId
      }
    }
  });

  if (!membership) {
    throw new Error('You are not a member of this group');
  }

  return membership;
}

export function assertOwnerRole(role: GroupRole) {
  if (role !== GroupRole.OWNER) {
    throw new Error('Only group owners can perform this action');
  }
}
