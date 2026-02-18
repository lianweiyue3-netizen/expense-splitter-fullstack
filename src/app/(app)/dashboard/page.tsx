import Link from 'next/link';
import { CreateGroupForm } from '@/components/create-group-form';
import { Card } from '@/components/ui/card';
import { formatMoney } from '@/lib/utils';
import { requireAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateNetBalances } from '@/server/domain/balances';

export default async function DashboardPage() {
  const session = await requireAuthSession();
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { defaultCurrencyCode: true }
  });
  const initialCurrencyCode = currentUser?.defaultCurrencyCode ?? 'USD';

  const memberships = await prisma.groupMember.findMany({
    where: { userId: session.user.id },
    include: {
      group: {
        include: {
          members: true,
          expenses: { include: { splits: true } },
          settlements: true
        }
      }
    }
  });

  const groups = memberships.map((entry) => entry.group);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">
          Manage groups, expenses, balances, and settlements.
        </p>
      </div>
      <Card>
        <h2 className="mb-3 text-lg font-medium">Create Group</h2>
        <CreateGroupForm initialCurrencyCode={initialCurrencyCode} />
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {groups.length === 0 ? (
          <Card>No groups yet. Create your first group.</Card>
        ) : (
          groups.map((group) => {
            const balances = calculateNetBalances(
              group.members.map((member) => member.userId),
              group.expenses.map((expense) => ({
                paidById: expense.paidById,
                splits: expense.splits.map((split) => ({
                  userId: split.userId,
                  amountMinor: split.amountMinor ?? 0
                }))
              })),
              group.settlements.map((settlement) => ({
                payerId: settlement.payerId,
                receiverId: settlement.receiverId,
                amountMinor: settlement.amountMinor
              }))
            );

            const myBalance =
              balances.find((balance) => balance.memberId === session.user.id)
                ?.netMinor ?? 0;
            const groupWithIcon = group as typeof group & { iconUrl?: string };
            const iconUrl = groupWithIcon.iconUrl ?? '/group-default-icon.svg';

            return (
              <Card key={group.id} className="space-y-3">
                <div className="flex items-center gap-3">
                  <img
                    alt={`${group.name} icon`}
                    className="h-10 w-10 rounded-full border border-neutral-700 object-cover"
                    src={iconUrl}
                  />
                  <h3 className="text-xl font-semibold">{group.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your net: {formatMoney(myBalance, group.baseCurrencyCode)}
                </p>
                <Link
                  className="text-primary underline"
                  href={`/groups/${group.id}`}
                >
                  Open group
                </Link>
              </Card>
            );
          })
        )}
      </div>
    </section>
  );
}
