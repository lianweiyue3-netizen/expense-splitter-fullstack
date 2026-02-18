import bcrypt from 'bcryptjs';
import {
  PrismaClient,
  SplitType,
  GroupRole,
  ActivityType
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      passwordHash,
      name: 'Alice',
      defaultCurrencyCode: 'USD'
    }
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      passwordHash,
      name: 'Bob',
      defaultCurrencyCode: 'USD'
    }
  });

  const group = await prisma.group.create({
    data: {
      name: 'Demo Apartment',
      baseCurrencyCode: 'USD',
      createdById: alice.id,
      members: {
        create: [
          { userId: alice.id, role: GroupRole.OWNER },
          { userId: bob.id, role: GroupRole.MEMBER }
        ]
      }
    }
  });

  const expense = await prisma.expense.create({
    data: {
      groupId: group.id,
      paidById: alice.id,
      amountMinor: 5000,
      currencyCode: 'USD',
      expenseDate: new Date(),
      note: 'Groceries',
      splitType: SplitType.EQUAL,
      splits: {
        create: [
          { userId: alice.id, amountMinor: 2500 },
          { userId: bob.id, amountMinor: 2500 }
        ]
      }
    }
  });

  await prisma.activity.createMany({
    data: [
      {
        groupId: group.id,
        actorId: alice.id,
        type: ActivityType.GROUP_CREATED,
        entityType: 'group',
        entityId: group.id
      },
      {
        groupId: group.id,
        actorId: alice.id,
        type: ActivityType.EXPENSE_CREATED,
        entityType: 'expense',
        entityId: expense.id,
        metadataJson: { amountMinor: 5000, currencyCode: 'USD' }
      }
    ]
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
