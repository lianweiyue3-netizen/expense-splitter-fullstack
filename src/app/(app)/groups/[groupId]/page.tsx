import { format } from 'date-fns';
import { notFound } from 'next/navigation';
import { ExpenseItemActions } from '@/components/expense-item-actions';
import { GroupActionsPanel } from '@/components/group-actions-panel';
import { SettlementItemActions } from '@/components/settlement-item-actions';
import { Card } from '@/components/ui/card';
import { requireAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatMoney } from '@/lib/utils';
import {
  calculateNetBalances,
  simplifyPayments
} from '@/server/domain/balances';

type Props = {
  params: Promise<{ groupId: string }>;
};

export default async function GroupPage({ params }: Props) {
  const { groupId } = await params;
  const session = await requireAuthSession();

  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId: session.user.id
      }
    }
  });

  if (!membership) {
    notFound();
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: { user: true }
      },
      expenses: {
        include: { paidBy: true, splits: true },
        orderBy: { expenseDate: 'desc' }
      },
      settlements: true
    }
  });

  if (!group) {
    notFound();
  }

  const members = group.members.map((member) => ({
    id: member.userId,
    name: member.user.name,
    email: member.user.email,
    role: member.role
  }));

  const monthLabel = group.expenses[0]?.expenseDate
    ? format(group.expenses[0].expenseDate, 'MMMM yyyy').toUpperCase()
    : format(new Date(), 'MMMM yyyy').toUpperCase();
  const groupWithTripDates = group as typeof group & {
    tripStartDate?: Date;
    tripEndDate?: Date | null;
  };
  const tripStartDate = groupWithTripDates.tripStartDate ?? group.createdAt;
  const tripEndDate = groupWithTripDates.tripEndDate ?? null;
  const groupWithIcon = group as typeof group & { iconUrl?: string };
  const groupIconUrl = groupWithIcon.iconUrl ?? '/group-default-icon.svg';
  const tripStartDateValue = format(tripStartDate, 'yyyy-MM-dd');
  const tripEndDateValue = tripEndDate
    ? format(tripEndDate, 'yyyy-MM-dd')
    : null;
  const tripDateLabel = tripEndDate
    ? `${format(tripStartDate, 'MMM d, yyyy')} - ${format(tripEndDate, 'MMM d, yyyy')}`
    : `${format(tripStartDate, 'MMM d, yyyy')}`;
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
  const memberNameById = new Map(
    group.members.map((member) => [member.userId, member.user.name])
  );
  const historicalUserIds = Array.from(
    new Set(balances.map((balance) => balance.memberId))
  ).filter((memberId) => !memberNameById.has(memberId));
  if (historicalUserIds.length > 0) {
    const historicalUsers = await prisma.user.findMany({
      where: { id: { in: historicalUserIds } },
      select: { id: true, name: true }
    });
    for (const user of historicalUsers) {
      memberNameById.set(user.id, user.name);
    }
  }
  const creditors = balances
    .filter((entry) => entry.netMinor > 0)
    .map((entry) => ({
      ...entry,
      name: memberNameById.get(entry.memberId) ?? entry.memberId
    }))
    .sort((a, b) => b.netMinor - a.netMinor);
  const debtors = balances
    .filter((entry) => entry.netMinor < 0)
    .map((entry) => ({
      ...entry,
      name: memberNameById.get(entry.memberId) ?? entry.memberId,
      owesMinor: Math.abs(entry.netMinor)
    }))
    .sort((a, b) => b.owesMinor - a.owesMinor);
  const settlementSuggestions = simplifyPayments(balances).map((payment) => ({
    ...payment,
    fromName: memberNameById.get(payment.from) ?? payment.from,
    toName: memberNameById.get(payment.to) ?? payment.to
  }));
  const totalByCurrency = group.expenses.reduce<Record<string, number>>(
    (acc, expense) => {
      acc[expense.currencyCode] =
        (acc[expense.currencyCode] ?? 0) + expense.amountMinor;
      return acc;
    },
    {}
  );
  const totalCurrencyItems = Object.entries(totalByCurrency).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  const groupedExpenses = group.expenses.reduce<
    Array<{
      id: string;
      expenseDate: Date;
      note: string;
      currencyCode: string;
      totalAmountMinor: number;
      payers: Array<{ userId: string; name: string; amountMinor: number }>;
      myPaidMinor: number;
      myShareMinor: number;
      expenseIds: string[];
      splitRows: Array<{ userId: string; amountMinor: number }>;
    }>
  >((acc, expense) => {
    const noteKey = (expense.note ?? '').trim().toLowerCase();
    const existing = acc.find(
      (item) =>
        item.currencyCode === expense.currencyCode &&
        item.note.trim().toLowerCase() === noteKey &&
        Math.abs(item.expenseDate.getTime() - expense.expenseDate.getTime()) <=
          10_000
    );
    if (!existing) {
      const key = `${expense.expenseDate.toISOString()}|${expense.currencyCode}|${noteKey}`;
      acc.push({
        id: key,
        expenseDate: expense.expenseDate,
        note: expense.note || 'Expense',
        currencyCode: expense.currencyCode,
        totalAmountMinor: expense.amountMinor,
        payers: [
          {
            userId: expense.paidById,
            name: expense.paidBy.name,
            amountMinor: expense.amountMinor
          }
        ],
        myPaidMinor:
          expense.paidById === session.user.id ? expense.amountMinor : 0,
        myShareMinor:
          expense.splits.find((split) => split.userId === session.user.id)
            ?.amountMinor ?? 0,
        expenseIds: [expense.id],
        splitRows: expense.splits.map((split) => ({
          userId: split.userId,
          amountMinor: split.amountMinor ?? 0
        }))
      });
      return acc;
    }

    existing.totalAmountMinor += expense.amountMinor;
    if (expense.paidById === session.user.id) {
      existing.myPaidMinor += expense.amountMinor;
    }
    existing.myShareMinor +=
      expense.splits.find((split) => split.userId === session.user.id)
        ?.amountMinor ?? 0;
    const payer = existing.payers.find(
      (item) => item.userId === expense.paidById
    );
    if (payer) {
      payer.amountMinor += expense.amountMinor;
    } else {
      existing.payers.push({
        userId: expense.paidById,
        name: expense.paidBy.name,
        amountMinor: expense.amountMinor
      });
    }
    existing.expenseIds.push(expense.id);
    for (const split of expense.splits) {
      const existingSplit = existing.splitRows.find(
        (row) => row.userId === split.userId
      );
      if (existingSplit) {
        existingSplit.amountMinor += split.amountMinor ?? 0;
      } else {
        existing.splitRows.push({
          userId: split.userId,
          amountMinor: split.amountMinor ?? 0
        });
      }
    }
    return acc;
  }, []);

  const groupedSettlements = [...group.settlements]
    .sort((a, b) => b.settledAt.getTime() - a.settledAt.getTime())
    .map((settlement) => ({
      id: settlement.id,
      settledAt: settlement.settledAt,
      payerId: settlement.payerId,
      receiverId: settlement.receiverId,
      payerName: memberNameById.get(settlement.payerId) ?? settlement.payerId,
      receiverName:
        memberNameById.get(settlement.receiverId) ?? settlement.receiverId,
      amountMinor: settlement.amountMinor,
      currencyCode: settlement.currencyCode,
      note: settlement.note?.trim() || null
    }));

  const timelineItems = [
    ...groupedExpenses.map((expense) => ({
      kind: 'expense' as const,
      id: `expense:${expense.id}`,
      date: expense.expenseDate,
      expense
    })),
    ...groupedSettlements.map((settlement) => ({
      kind: 'settlement' as const,
      id: `settlement:${settlement.id}`,
      date: settlement.settledAt,
      settlement
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <section className="space-y-6">
      <div className="border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-4">
          <img
            alt={`${group.name} icon`}
            className="h-16 w-16 rounded-full border border-neutral-700 object-cover"
            src={groupIconUrl}
          />
          <div>
            <h1 className="text-4xl font-semibold">{group.name}</h1>
            <p className="text-neutral-400">
              {group.members.length} people • Currency: {group.baseCurrencyCode}
            </p>
            <p className="text-neutral-400">Trip dates: {tripDateLabel}</p>
          </div>
        </div>
      </div>

      <GroupActionsPanel
        groupId={group.id}
        currentUserId={session.user.id}
        currentUserRole={membership.role}
        groupName={group.name}
        groupIconUrl={groupIconUrl}
        groupCurrencyCode={group.baseCurrencyCode}
        tripStartDate={tripStartDateValue}
        tripEndDate={tripEndDateValue}
        members={members}
        defaultCurrencyCode={group.baseCurrencyCode}
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-neutral-200 bg-neutral-100 px-4 py-2 text-xs font-semibold text-neutral-600">
            {monthLabel}
          </div>
          {timelineItems.length === 0 ? (
            <div className="px-4 py-8 text-sm text-neutral-500">
              No expenses or settlements yet.
            </div>
          ) : (
            <ul>
              {timelineItems.map((item) => {
                if (item.kind === 'expense') {
                  const expense = item.expense;
                  const truncateName = (name: string) =>
                    name.length > 14 ? `${name.slice(0, 14)}...` : name;
                  const payerText = expense.payers
                    .map(
                      (payer) =>
                        `${truncateName(payer.name)} ${formatMoney(payer.amountMinor, expense.currencyCode)}`
                    )
                    .join(', ');
                  const myNetMinor = expense.myPaidMinor - expense.myShareMinor;
                  const lentOrOwedLabel =
                    myNetMinor > 0
                      ? `You lent ${formatMoney(myNetMinor, expense.currencyCode)}`
                      : myNetMinor < 0
                        ? `You owe ${formatMoney(Math.abs(myNetMinor), expense.currencyCode)}`
                        : 'You are settled';

                  return (
                    <li
                      key={item.id}
                      className="grid grid-cols-[84px_1fr_240px] items-start gap-4 border-b border-neutral-200 px-4 py-4 last:border-b-0"
                    >
                      <div className="text-center">
                        <p className="text-xs font-semibold text-neutral-500">
                          {format(expense.expenseDate, 'MMM').toUpperCase()}
                        </p>
                        <p className="text-3xl leading-none text-neutral-700">
                          {format(expense.expenseDate, 'd')}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-lg font-semibold text-neutral-800">
                          {expense.note || 'Expense'}
                        </p>
                        <div className="text-sm text-neutral-600">
                          <p className="font-medium">Paid by</p>
                          <p className="truncate">{payerText}</p>
                        </div>
                      </div>

                      <div className="space-y-2 text-right">
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                          Total spent
                        </p>
                        <p className="text-3xl font-semibold text-neutral-900">
                          {formatMoney(
                            expense.totalAmountMinor,
                            expense.currencyCode
                          )}
                        </p>
                        <p
                          className={`text-sm ${myNetMinor > 0 ? 'text-emerald-600' : myNetMinor < 0 ? 'text-rose-600' : 'text-neutral-500'}`}
                        >
                          {lentOrOwedLabel}
                        </p>
                        <div className="flex justify-end pt-1">
                          <ExpenseItemActions
                            groupId={groupId}
                            expenseIds={expense.expenseIds}
                            editDraft={{
                              mode: 'EDIT',
                              note: expense.note,
                              amountMinor: expense.totalAmountMinor,
                              involvedMemberIds: Array.from(
                                new Set(
                                  expense.splitRows.map((row) => row.userId)
                                )
                              ),
                              payerRows: expense.payers.map((payer) => ({
                                userId: payer.userId,
                                amountMinor: payer.amountMinor
                              })),
                              splitRows: expense.splitRows,
                              replaceExpenseIds: expense.expenseIds,
                              originalExpenseDateIso:
                                expense.expenseDate.toISOString()
                            }}
                          />
                        </div>
                      </div>
                    </li>
                  );
                }

                const settlement = item.settlement;
                return (
                  <li
                    key={item.id}
                    className="grid grid-cols-[84px_1fr_240px] items-start gap-4 border-b border-neutral-200 bg-neutral-100 px-4 py-4 last:border-b-0"
                  >
                    <div className="text-center">
                      <p className="text-xs font-semibold text-neutral-500">
                        {format(settlement.settledAt, 'MMM').toUpperCase()}
                      </p>
                      <p className="text-3xl leading-none text-neutral-700">
                        {format(settlement.settledAt, 'd')}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-neutral-800">
                        {settlement.note ?? 'Settlement'}
                      </p>
                      <p className="text-sm text-neutral-600">
                        {settlement.payerName} paid {settlement.receiverName}
                      </p>
                    </div>

                    <div className="space-y-2 text-right">
                      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        Amount
                      </p>
                      <p className="text-2xl font-semibold text-neutral-900">
                        {formatMoney(
                          settlement.amountMinor,
                          settlement.currencyCode
                        )}
                      </p>
                      <div className="flex justify-end pt-1">
                        <SettlementItemActions
                          groupId={groupId}
                          settlementId={settlement.id}
                          editDraft={{
                            mode: 'EDIT',
                            settlementId: settlement.id,
                            payerId: settlement.payerId,
                            receiverId: settlement.receiverId,
                            amountMinor: settlement.amountMinor,
                            note: settlement.note,
                            settledAtIso: settlement.settledAt.toISOString()
                          }}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="space-y-4 self-start border border-neutral-500 bg-[radial-gradient(circle_at_top_left,_#111111,_#000000_60%)] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
          <h2 className="text-lg font-semibold">Group balance</h2>

          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-neutral-400">
              Total spent this trip
            </p>
            {totalCurrencyItems.length === 0 ? (
              <p className="text-sm text-neutral-300">No expenses yet.</p>
            ) : (
              totalCurrencyItems.map(([currencyCode, amountMinor]) => (
                <p key={currencyCode} className="text-sm font-medium">
                  {formatMoney(amountMinor, currencyCode)}
                </p>
              ))
            )}
          </div>

          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-neutral-400">
              Who owes
            </p>
            {debtors.length === 0 ? (
              <p className="text-sm text-neutral-300">No one owes.</p>
            ) : (
              debtors.map((debtor) => (
                <p key={debtor.memberId} className="text-sm text-rose-300">
                  {debtor.name} owes{' '}
                  {formatMoney(debtor.owesMinor, group.baseCurrencyCode)}
                </p>
              ))
            )}
          </div>

          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-neutral-400">
              Who gets back
            </p>
            {creditors.length === 0 ? (
              <p className="text-sm text-neutral-300">
                No one to receive money.
              </p>
            ) : (
              creditors.map((creditor) => (
                <p key={creditor.memberId} className="text-sm text-emerald-300">
                  {creditor.name} gets{' '}
                  {formatMoney(creditor.netMinor, group.baseCurrencyCode)}
                </p>
              ))
            )}
          </div>

          <div className="space-y-1 border-t border-neutral-800 pt-3">
            <p className="text-xs uppercase tracking-wide text-neutral-400">
              Suggested settlements
            </p>
            {settlementSuggestions.length === 0 ? (
              <p className="text-sm text-neutral-300">All settled.</p>
            ) : (
              settlementSuggestions.map((edge) => (
                <p
                  key={`${edge.from}-${edge.to}`}
                  className="text-sm text-neutral-200"
                >
                  {edge.fromName} pays {edge.toName}{' '}
                  {formatMoney(edge.amountMinor, group.baseCurrencyCode)}
                </p>
              ))
            )}
          </div>
        </Card>
      </div>
    </section>
  );
}
