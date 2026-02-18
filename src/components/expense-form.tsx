'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const SplitType = {
  EQUAL: 'EQUAL',
  CUSTOM_AMOUNT: 'CUSTOM_AMOUNT',
  PERCENTAGE: 'PERCENTAGE'
} as const;
type SplitType = (typeof SplitType)[keyof typeof SplitType];

const SplitOption = {
  SPLIT_EXPENSE: 'SPLIT_EXPENSE',
  YOU_OWE_FULL: 'YOU_OWE_FULL',
  THEY_OWE_FULL: 'THEY_OWE_FULL'
} as const;
type SplitOption = (typeof SplitOption)[keyof typeof SplitOption];

type Member = {
  id: string;
  name: string;
  email: string;
};

type Props = {
  groupId: string;
  members: Member[];
  defaultCurrencyCode: string;
  currentUserId: string;
  editDraft?: ExpenseEditDraft | null;
  onSaved?: () => void;
  onClose?: () => void;
};

type PieSlice = {
  id: string;
  label: string;
  valueMinor: number;
};

type PayerRow = {
  userId: string;
  amountInput: string;
};

export type ExpenseEditDraft = {
  mode: 'EDIT';
  note: string;
  amountMinor: number;
  involvedMemberIds: string[];
  payerRows: Array<{ userId: string; amountMinor: number }>;
  splitRows: Array<{ userId: string; amountMinor: number }>;
  replaceExpenseIds: string[];
  originalExpenseDateIso?: string;
};

const PIE_COLORS = [
  '#f97316',
  '#60a5fa',
  '#34d399',
  '#fbbf24',
  '#c084fc',
  '#f87171',
  '#22d3ee',
  '#a3e635'
];

function parseAmountToMinor(value: string): number {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return 0;
  }
  return Math.round(numeric * 100);
}

function sanitizeMoneyInput(value: string): string {
  const nextValue = value.replace(/[^0-9.]/g, '');
  const firstDot = nextValue.indexOf('.');
  const normalized =
    firstDot === -1
      ? nextValue
      : `${nextValue.slice(0, firstDot + 1)}${nextValue.slice(firstDot + 1).replace(/\./g, '')}`;
  if (firstDot === -1) {
    return normalized;
  }
  const [whole, decimals = ''] = normalized.split('.');
  return `${whole}.${decimals.slice(0, 2)}`;
}

function roundMoneyInput(value: string): string {
  if (!value.trim()) {
    return '';
  }
  return formatMinorToAmount(parseAmountToMinor(value));
}

function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return isoToDateInput(null);
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dateInputToIso(value: string): string {
  const [y, m, d] = value.split('-').map((part) => Number(part));
  if (!y || !m || !d) {
    return new Date().toISOString();
  }
  // Use local noon to reduce day-shift issues caused by timezone conversions.
  const date = new Date(y, m - 1, d, 12, 0, 0, 0);
  return date.toISOString();
}

function parsePercentToBps(value: string): number {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return 0;
  }
  return Math.round(numeric * 100);
}

function formatMinorToAmount(valueMinor: number): string {
  if (Math.abs(valueMinor % 100) === 0) {
    return String(valueMinor / 100);
  }
  return (valueMinor / 100).toFixed(2);
}

function makeConicGradient(slices: PieSlice[]): string {
  const total = slices.reduce(
    (sum, slice) => sum + Math.max(0, slice.valueMinor),
    0
  );
  if (total <= 0) {
    return 'conic-gradient(#525252 0deg 360deg)';
  }

  let start = 0;
  const parts = slices
    .filter((slice) => slice.valueMinor > 0)
    .map((slice, index) => {
      const ratio = slice.valueMinor / total;
      const end = start + ratio * 360;
      const color = PIE_COLORS[index % PIE_COLORS.length];
      const token = `${color} ${start}deg ${end}deg`;
      start = end;
      return token;
    });

  return `conic-gradient(${parts.join(', ')})`;
}

function prorateByTotal(
  totalMinor: number,
  targetMinor: number,
  byUserMinor: Array<{ userId: string; amountMinor: number }>
) {
  if (targetMinor <= 0) {
    return byUserMinor.map((item) => ({ userId: item.userId, amountMinor: 0 }));
  }

  if (totalMinor <= 0) {
    const base = Math.floor(targetMinor / byUserMinor.length);
    let remainder = targetMinor % byUserMinor.length;
    return byUserMinor.map((item) => {
      const extra = remainder > 0 ? 1 : 0;
      remainder = Math.max(0, remainder - 1);
      return { userId: item.userId, amountMinor: base + extra };
    });
  }

  const output: Array<{ userId: string; amountMinor: number }> = [];
  let assigned = 0;
  byUserMinor.forEach((item, index) => {
    const isLast = index === byUserMinor.length - 1;
    const value = isLast
      ? targetMinor - assigned
      : Math.floor((item.amountMinor * targetMinor) / totalMinor);
    assigned += value;
    output.push({ userId: item.userId, amountMinor: value });
  });
  return output;
}

function PieCard({
  title,
  currencySymbol,
  slices,
  emptyLabel
}: {
  title: string;
  currencySymbol: string;
  slices: PieSlice[];
  emptyLabel: string;
}) {
  const totalMinor = slices.reduce(
    (sum, slice) => sum + Math.max(0, slice.valueMinor),
    0
  );
  const gradient = useMemo(() => makeConicGradient(slices), [slices]);

  return (
    <div className="space-y-3 rounded-md border border-neutral-700 p-3">
      <p className="text-sm font-medium text-neutral-400">{title}</p>
      {totalMinor <= 0 ? (
        <p className="text-sm text-neutral-400">{emptyLabel}</p>
      ) : null}
      <div className="flex flex-col items-center gap-4">
        <div
          className="relative h-24 w-24 shrink-0 rounded-full"
          style={{ background: gradient }}
        >
          <div className="absolute inset-[18%] rounded-full bg-neutral-950" />
        </div>
        <div className="space-y-2 text-center text-sm font-medium text-neutral-400">
          {slices
            .filter((slice) => slice.valueMinor > 0)
            .map((slice, index) => {
              const pct =
                totalMinor > 0
                  ? ((slice.valueMinor / totalMinor) * 100).toFixed(1)
                  : '0.0';
              return (
                <div
                  key={`${slice.id}-${index}`}
                  className="flex items-center justify-center gap-2"
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor: PIE_COLORS[index % PIE_COLORS.length]
                    }}
                  />
                  <span>
                    {slice.label}: {pct}% ({currencySymbol}
                    {formatMinorToAmount(slice.valueMinor)})
                  </span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

export function ExpenseForm({
  groupId,
  members,
  defaultCurrencyCode,
  currentUserId,
  editDraft,
  onSaved,
  onClose
}: Props) {
  const router = useRouter();
  const [amountInput, setAmountInput] = useState('');
  const [note, setNote] = useState('');
  const [expenseDateInput, setExpenseDateInput] = useState<string>(
    isoToDateInput(null)
  );
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [involvementMode, setInvolvementMode] = useState<'ALL' | 'SELECTED'>(
    'ALL'
  );
  const [involvedMemberIds, setInvolvedMemberIds] = useState<string[]>(
    members.map((member) => member.id)
  );

  const [payerMode, setPayerMode] = useState<'SINGLE' | 'MULTIPLE'>('SINGLE');
  const [singlePayerId, setSinglePayerId] = useState<string>(currentUserId);
  const [payerRows, setPayerRows] = useState<PayerRow[]>([
    { userId: currentUserId, amountInput: '' },
    {
      userId:
        members.find((member) => member.id !== currentUserId)?.id ??
        currentUserId,
      amountInput: ''
    }
  ]);

  const [splitOption, setSplitOption] = useState<SplitOption>(
    SplitOption.SPLIT_EXPENSE
  );
  const [splitType, setSplitType] = useState<SplitType>(SplitType.EQUAL);
  const [customByMember, setCustomByMember] = useState<Record<string, string>>(
    {}
  );
  const [percentByMember, setPercentByMember] = useState<
    Record<string, string>
  >({});
  const [replaceExpenseIds, setReplaceExpenseIds] = useState<string[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editExpenseDateIso, setEditExpenseDateIso] = useState<string | null>(
    null
  );

  const allMembersInvolved = involvementMode === 'ALL';
  const amountMinor = parseAmountToMinor(amountInput);

  const duplicateNames = useMemo(() => {
    const counts = new Map<string, number>();
    members.forEach((member) => {
      counts.set(member.name, (counts.get(member.name) ?? 0) + 1);
    });
    return new Set(
      Array.from(counts.entries())
        .filter(([, count]) => count > 1)
        .map(([name]) => name)
    );
  }, [members]);

  const memberLabel = (member: Member) =>
    duplicateNames.has(member.name)
      ? `${member.name} (${member.email})`
      : member.name;

  const activeMembers = useMemo(() => {
    if (allMembersInvolved) {
      return members;
    }
    return members.filter((member) => involvedMemberIds.includes(member.id));
  }, [allMembersInvolved, involvedMemberIds, members]);

  const currencySymbol = useMemo(() => {
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      CNY: '¥',
      SGD: 'S$',
      MYR: 'RM'
    };
    return symbols[defaultCurrencyCode] ?? defaultCurrencyCode;
  }, [defaultCurrencyCode]);

  useEffect(() => {
    const activeIds = new Set(activeMembers.map((member) => member.id));
    setSinglePayerId((prev) =>
      activeIds.has(prev) ? prev : (activeMembers[0]?.id ?? '')
    );
    setPayerRows((prev) => {
      const filtered = prev.map((row) => ({
        ...row,
        userId: activeIds.has(row.userId)
          ? row.userId
          : (activeMembers[0]?.id ?? '')
      }));
      return filtered.length > 0
        ? filtered
        : [{ userId: activeMembers[0]?.id ?? '', amountInput: '' }];
    });
  }, [activeMembers]);

  useEffect(() => {
    if (!editDraft || editDraft.mode !== 'EDIT') {
      return;
    }

    setNote(editDraft.note);
    setAmountInput(formatMinorToAmount(editDraft.amountMinor));
    setInvolvementMode('SELECTED');
    setInvolvedMemberIds(editDraft.involvedMemberIds);
    if (editDraft.payerRows.length <= 1) {
      setPayerMode('SINGLE');
      setSinglePayerId(editDraft.payerRows[0]?.userId ?? currentUserId);
      setPayerRows([
        {
          userId: editDraft.payerRows[0]?.userId ?? currentUserId,
          amountInput: formatMinorToAmount(
            editDraft.payerRows[0]?.amountMinor ?? 0
          )
        }
      ]);
    } else {
      setPayerMode('MULTIPLE');
      setPayerRows(
        editDraft.payerRows.map((row) => ({
          userId: row.userId,
          amountInput: formatMinorToAmount(row.amountMinor)
        }))
      );
    }
    setSplitOption(SplitOption.SPLIT_EXPENSE);
    setSplitType(SplitType.CUSTOM_AMOUNT);
    setCustomByMember(
      editDraft.splitRows.reduce<Record<string, string>>((acc, row) => {
        acc[row.userId] = formatMinorToAmount(row.amountMinor);
        return acc;
      }, {})
    );
    setReplaceExpenseIds(editDraft.replaceExpenseIds);
    setIsEditMode(true);
    setEditExpenseDateIso(editDraft.originalExpenseDateIso ?? null);
    setExpenseDateInput(
      isoToDateInput(editDraft.originalExpenseDateIso ?? null)
    );
  }, [currentUserId, editDraft]);

  useEffect(() => {
    if (payerRows.length === 0) {
      return;
    }
    const manualPayerMinor = payerRows
      .slice(0, Math.max(0, payerRows.length - 1))
      .reduce((sum, payer) => sum + parseAmountToMinor(payer.amountInput), 0);
    const suggestedPayerRemainderMinor = Math.max(
      0,
      amountMinor - manualPayerMinor
    );
    const suggestedText = formatMinorToAmount(suggestedPayerRemainderMinor);
    setPayerRows((prev) => {
      if (prev.length === 0) {
        return prev;
      }
      const lastIndex = prev.length - 1;
      if (prev[lastIndex].amountInput === suggestedText) {
        return prev;
      }
      const next = [...prev];
      next[lastIndex] = { ...next[lastIndex], amountInput: suggestedText };
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    amountMinor,
    payerRows.length,
    payerRows
      .slice(0, Math.max(0, payerRows.length - 1))
      .map((payer) => payer.amountInput)
      .join('|')
  ]);

  useEffect(() => {
    if (splitType !== SplitType.CUSTOM_AMOUNT || activeMembers.length === 0) {
      return;
    }
    const lastMemberId = activeMembers[activeMembers.length - 1]?.id;
    if (!lastMemberId) {
      return;
    }
    const manualCustomMinor = activeMembers
      .slice(0, Math.max(0, activeMembers.length - 1))
      .reduce(
        (sum, currentMember) =>
          sum + parseAmountToMinor(customByMember[currentMember.id] ?? ''),
        0
      );
    const suggestedCustomRemainderMinor = Math.max(
      0,
      amountMinor - manualCustomMinor
    );
    const suggestedText = formatMinorToAmount(suggestedCustomRemainderMinor);
    setCustomByMember((prev) => {
      if ((prev[lastMemberId] ?? '') === suggestedText) {
        return prev;
      }
      return { ...prev, [lastMemberId]: suggestedText };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    splitType,
    amountMinor,
    activeMembers.map((member) => member.id).join('|'),
    activeMembers
      .slice(0, Math.max(0, activeMembers.length - 1))
      .map((member) => customByMember[member.id] ?? '')
      .join('|')
  ]);

  useEffect(() => {
    if (splitType !== SplitType.PERCENTAGE || activeMembers.length === 0) {
      return;
    }
    const lastMemberId = activeMembers[activeMembers.length - 1]?.id;
    if (!lastMemberId) {
      return;
    }
    const manualPercentBps = activeMembers
      .slice(0, Math.max(0, activeMembers.length - 1))
      .reduce(
        (sum, currentMember) =>
          sum + parsePercentToBps(percentByMember[currentMember.id] ?? ''),
        0
      );
    const suggestedPercentBps = Math.max(0, 10_000 - manualPercentBps);
    const suggestedText = (suggestedPercentBps / 100).toFixed(2);
    setPercentByMember((prev) => {
      if ((prev[lastMemberId] ?? '') === suggestedText) {
        return prev;
      }
      return { ...prev, [lastMemberId]: suggestedText };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    splitType,
    activeMembers.map((member) => member.id).join('|'),
    activeMembers
      .slice(0, Math.max(0, activeMembers.length - 1))
      .map((member) => percentByMember[member.id] ?? '')
      .join('|')
  ]);

  const payerComputation = useMemo(() => {
    if (payerMode === 'SINGLE') {
      if (!singlePayerId) {
        return {
          rows: [] as Array<{ userId: string; amountMinor: number }>,
          invalid: 'Please choose who paid this expense.'
        };
      }
      return {
        rows: [{ userId: singlePayerId, amountMinor }],
        invalid: null as string | null
      };
    }

    if (payerRows.length < 2) {
      return {
        rows: [] as Array<{ userId: string; amountMinor: number }>,
        invalid: 'Please add at least two payers.'
      };
    }

    const rows = payerRows.map((row) => {
      const valueMinor = parseAmountToMinor(row.amountInput);
      return { userId: row.userId, amountMinor: valueMinor };
    });

    if (rows.some((row) => !row.userId)) {
      return { rows, invalid: 'Please choose all payers.' };
    }
    const uniquePayers = new Set(rows.map((row) => row.userId));
    if (uniquePayers.size !== rows.length) {
      return { rows, invalid: 'Each payer must be unique.' };
    }

    const total = rows.reduce((sum, row) => sum + row.amountMinor, 0);
    if (total !== amountMinor) {
      return {
        rows,
        invalid: 'Invalid amount: payer amounts must match the price.'
      };
    }
    if (rows.some((row) => row.amountMinor < 0)) {
      return { rows, invalid: 'Invalid amount.' };
    }
    return { rows, invalid: null as string | null };
  }, [amountMinor, payerMode, payerRows, singlePayerId]);

  const payerSlices = useMemo(() => {
    const byId = new Map(members.map((member) => [member.id, member]));
    return payerComputation.rows.map((row) => ({
      id: row.userId,
      label: memberLabel(
        byId.get(row.userId) ?? { id: row.userId, name: row.userId, email: '' }
      ),
      valueMinor: row.amountMinor
    }));
  }, [memberLabel, members, payerComputation.rows]);

  const canAddPayer = payerRows.length < activeMembers.length;

  const owedComputation = useMemo(() => {
    if (activeMembers.length === 0) {
      return {
        rows: [] as Array<{ userId: string; amountMinor: number }>,
        invalid: 'Please select at least one involved member.'
      };
    }

    if (splitOption === SplitOption.YOU_OWE_FULL) {
      if (!activeMembers.some((member) => member.id === currentUserId)) {
        return {
          rows: [] as Array<{ userId: string; amountMinor: number }>,
          invalid: 'You are not in the involved members list.'
        };
      }
      return {
        rows: [{ userId: currentUserId, amountMinor }],
        invalid: null as string | null
      };
    }

    if (splitOption === SplitOption.THEY_OWE_FULL) {
      const others = activeMembers.filter(
        (member) => member.id !== currentUserId
      );
      if (others.length === 0) {
        return {
          rows: [] as Array<{ userId: string; amountMinor: number }>,
          invalid: 'No other involved members to assign.'
        };
      }
      const base = Math.floor(amountMinor / others.length);
      let remainder = amountMinor % others.length;
      return {
        rows: others.map((member) => {
          const extra = remainder > 0 ? 1 : 0;
          remainder = Math.max(0, remainder - 1);
          return { userId: member.id, amountMinor: base + extra };
        }),
        invalid: null as string | null
      };
    }

    if (splitType === SplitType.EQUAL) {
      const base = Math.floor(amountMinor / activeMembers.length);
      let remainder = amountMinor % activeMembers.length;
      return {
        rows: activeMembers.map((member) => {
          const extra = remainder > 0 ? 1 : 0;
          remainder = Math.max(0, remainder - 1);
          return { userId: member.id, amountMinor: base + extra };
        }),
        invalid: null as string | null
      };
    }

    if (splitType === SplitType.CUSTOM_AMOUNT) {
      if (activeMembers.length === 0) {
        return {
          rows: [] as Array<{ userId: string; amountMinor: number }>,
          invalid: 'Please select at least one involved member.'
        };
      }

      const rows = activeMembers.map((member) => ({
        userId: member.id,
        amountMinor: parseAmountToMinor(customByMember[member.id] ?? '')
      }));
      const total = rows.reduce((sum, row) => sum + row.amountMinor, 0);
      if (total !== amountMinor) {
        return {
          rows,
          invalid: 'Invalid amount: split amounts must match the price.'
        };
      }
      return { rows, invalid: null as string | null };
    }

    if (activeMembers.length === 0) {
      return {
        rows: [] as Array<{ userId: string; amountMinor: number }>,
        invalid: 'Please select at least one involved member.'
      };
    }
    const percentageRows = activeMembers.map((member) => ({
      userId: member.id,
      percentageBps: parsePercentToBps(percentByMember[member.id] ?? '')
    }));
    const totalBps = percentageRows.reduce(
      (sum, row) => sum + row.percentageBps,
      0
    );
    if (totalBps !== 10_000) {
      return {
        rows: [] as Array<{ userId: string; amountMinor: number }>,
        invalid: 'Percentages must sum to 100%.'
      };
    }
    let assigned = 0;
    const converted = percentageRows.map((row, index) => {
      const isLast = index === percentageRows.length - 1;
      const value = isLast
        ? amountMinor - assigned
        : Math.floor((amountMinor * row.percentageBps) / 10_000);
      assigned += value;
      return { userId: row.userId, amountMinor: value };
    });
    return { rows: converted, invalid: null as string | null };
  }, [
    activeMembers,
    amountMinor,
    currentUserId,
    customByMember,
    percentByMember,
    splitOption,
    splitType
  ]);

  const owedSlices = useMemo(() => {
    const byId = new Map(members.map((member) => [member.id, member]));
    return owedComputation.rows.map((row) => ({
      id: row.userId,
      label: memberLabel(
        byId.get(row.userId) ?? { id: row.userId, name: row.userId, email: '' }
      ),
      valueMinor: row.amountMinor
    }));
  }, [memberLabel, members, owedComputation.rows]);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (isSaving) {
          return;
        }
        setMessage(null);
        setIsSaving(true);

        if (amountMinor <= 0) {
          setMessage('Please enter a valid price.');
          setIsSaving(false);
          return;
        }
        if (payerComputation.invalid) {
          setMessage(payerComputation.invalid);
          setIsSaving(false);
          return;
        }
        if (owedComputation.invalid) {
          setMessage(owedComputation.invalid);
          setIsSaving(false);
          return;
        }
        if (isEditMode && replaceExpenseIds.length === 0) {
          setMessage('Edit context missing. Please click the edit icon again.');
          setIsSaving(false);
          return;
        }

        const totalOwedMinor = owedComputation.rows.reduce(
          (sum, row) => sum + row.amountMinor,
          0
        );
        if (totalOwedMinor !== amountMinor) {
          setMessage('Invalid amount: split does not match the price.');
          setIsSaving(false);
          return;
        }

        let firstError: string | null = null;
        const expenseDateIso = dateInputToIso(expenseDateInput);
        const rowsPayload = payerComputation.rows.map((payer) => {
          const proportionalParticipants = prorateByTotal(
            amountMinor,
            payer.amountMinor,
            owedComputation.rows
          ).map((entry) => ({
            userId: entry.userId,
            amountMinor: entry.amountMinor
          }));
          return {
            paidById: payer.userId,
            amountMinor: payer.amountMinor,
            note: note || undefined,
            currencyCode: defaultCurrencyCode,
            expenseDate: expenseDateIso,
            participants: proportionalParticipants
          };
        });

        if (replaceExpenseIds.length > 0) {
          const replaceResponse = await fetch(
            `/api/groups/${groupId}/expenses/replace`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                replaceExpenseIds,
                rows: rowsPayload
              })
            }
          );
          if (!replaceResponse.ok) {
            const body = (await replaceResponse.json()) as { error?: string };
            firstError = body.error ?? 'Unable to update expense';
          }
        } else {
          for (const row of rowsPayload) {
            const response = await fetch(`/api/groups/${groupId}/expenses`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                paidById: row.paidById,
                amountMinor: row.amountMinor,
                splitType: SplitType.CUSTOM_AMOUNT,
                note: row.note,
                currencyCode: row.currencyCode,
                expenseDate: row.expenseDate,
                participants: row.participants
              })
            });

            if (!response.ok) {
              const body = (await response.json()) as { error?: string };
              firstError = body.error ?? 'Unable to add expense';
              break;
            }
          }
        }

        if (!firstError) {
          setReplaceExpenseIds([]);
          setIsEditMode(false);
          setEditExpenseDateIso(null);
        }
        setMessage(
          firstError ?? (isEditMode ? 'Expense updated' : 'Expense added')
        );
        if (!firstError) {
          router.refresh();
          onSaved?.();
        }
        setIsSaving(false);
      }}
    >
      <div className="space-y-2">
        <label
          className="text-sm text-white"
          htmlFor="expense-involvement-mode"
        >
          Who is involved in this expense
        </label>
        <select
          id="expense-involvement-mode"
          className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-black"
          value={involvementMode}
          onChange={(event) => {
            const mode = event.target.value as 'ALL' | 'SELECTED';
            setInvolvementMode(mode);
            if (mode === 'ALL') {
              setInvolvedMemberIds(members.map((member) => member.id));
            }
          }}
        >
          <option value="ALL">All members involved</option>
          <option value="SELECTED">Choose involved members</option>
        </select>
        <p className="text-xs text-neutral-400">
          Default is all members. Choose custom if this expense involves only
          some people.
        </p>
        {!allMembersInvolved ? (
          <div className="grid gap-2 rounded-md border border-neutral-700 p-3">
            {members.map((member) => (
              <label
                key={member.id}
                className="flex items-center gap-2 text-sm text-neutral-400"
              >
                {(() => {
                  const isChecked = involvedMemberIds.includes(member.id);
                  return (
                    <>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(event) => {
                          setInvolvedMemberIds((prev) => {
                            if (event.target.checked) {
                              return [...prev, member.id];
                            }
                            return prev.filter((id) => id !== member.id);
                          });
                        }}
                      />
                      <span
                        className={
                          isChecked
                            ? 'font-semibold text-black'
                            : 'text-neutral-400'
                        }
                      >
                        {memberLabel(member)}
                      </span>
                    </>
                  );
                })()}
              </label>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Input
          placeholder="Enter a description"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />

        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
            {currencySymbol}
          </span>
          <Input
            type="text"
            inputMode="decimal"
            pattern="^\d*([.]\d{0,2})?$"
            placeholder="Price"
            value={amountInput}
            onChange={(event) =>
              setAmountInput(sanitizeMoneyInput(event.target.value))
            }
            onBlur={(event) =>
              setAmountInput(roundMoneyInput(event.target.value))
            }
            required
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-md border border-neutral-700 p-3">
          <p className="text-sm font-medium text-white">Paid by who</p>

          <div className="space-y-2">
            <label className="text-xs text-neutral-400">Payer mode</label>
            <select
              className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-black"
              value={payerMode}
              onChange={(event) =>
                setPayerMode(event.target.value as 'SINGLE' | 'MULTIPLE')
              }
            >
              <option value="SINGLE">Single payer</option>
              <option value="MULTIPLE">Multiple payers</option>
            </select>
          </div>

          {payerMode === 'SINGLE' ? (
            <div className="space-y-2">
              <label className="text-xs text-neutral-400">
                Choose who paid (default is creator)
              </label>
              <select
                className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-black"
                value={singlePayerId}
                onChange={(event) => setSinglePayerId(event.target.value)}
              >
                {activeMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {memberLabel(member)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-2">
              {payerRows.map((row, index) => {
                const isLast = index === payerRows.length - 1;
                const usedByOthers = new Set(
                  payerRows
                    .filter((_, payerIndex) => payerIndex !== index)
                    .map((payer) => payer.userId)
                );
                const manualPayerMinor = payerRows
                  .slice(0, Math.max(0, payerRows.length - 1))
                  .reduce(
                    (sum, payer) => sum + parseAmountToMinor(payer.amountInput),
                    0
                  );
                const suggestedPayerRemainderMinor = Math.max(
                  0,
                  amountMinor - manualPayerMinor
                );
                return (
                  <div
                    key={`${row.userId}-${index}`}
                    className="rounded-md border border-neutral-700 p-2"
                  >
                    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_150px_auto]">
                      <select
                        className="rounded-md border border-input bg-white px-3 py-2 text-sm text-black"
                        value={row.userId}
                        onChange={(event) => {
                          const next = event.target.value;
                          setPayerRows((prev) =>
                            prev.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, userId: next }
                                : item
                            )
                          );
                        }}
                      >
                        {activeMembers
                          .filter(
                            (member) =>
                              member.id === row.userId ||
                              !usedByOthers.has(member.id)
                          )
                          .map((member) => (
                            <option key={member.id} value={member.id}>
                              {memberLabel(member)}
                            </option>
                          ))}
                      </select>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">
                          {currencySymbol}
                        </span>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={row.amountInput}
                          onChange={(event) => {
                            setPayerRows((prev) =>
                              prev.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      amountInput: sanitizeMoneyInput(
                                        event.target.value
                                      )
                                    }
                                  : item
                              )
                            );
                          }}
                          onBlur={(event) => {
                            setPayerRows((prev) =>
                              prev.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      amountInput: roundMoneyInput(
                                        event.target.value
                                      )
                                    }
                                  : item
                              )
                            );
                          }}
                          className="pl-7"
                        />
                      </div>
                      <button
                        type="button"
                        className="rounded-md border border-neutral-500 bg-neutral-800 px-2 py-1 text-sm text-white transition hover:bg-neutral-700 disabled:opacity-40"
                        disabled={payerRows.length <= 2}
                        onClick={() => {
                          setPayerRows((prev) =>
                            prev.filter((_, itemIndex) => itemIndex !== index)
                          );
                        }}
                      >
                        Remove
                      </button>
                    </div>
                    {index === payerRows.length - 1 ? (
                      <p className="mt-1 text-xs text-neutral-400">
                        Auto-calculated remainder: {currencySymbol}
                        {formatMinorToAmount(suggestedPayerRemainderMinor)}
                      </p>
                    ) : null}
                  </div>
                );
              })}

              <button
                type="button"
                className="rounded-md border border-neutral-500 bg-neutral-800 px-3 py-1 text-sm text-white transition hover:bg-neutral-700 disabled:opacity-40"
                disabled={!canAddPayer}
                onClick={() => {
                  if (!canAddPayer) {
                    return;
                  }
                  const existing = new Set(
                    payerRows.map((payer) => payer.userId)
                  );
                  const nextMember = activeMembers.find(
                    (member) => !existing.has(member.id)
                  );
                  setPayerRows((prev) => [
                    ...prev,
                    {
                      userId: nextMember?.id ?? activeMembers[0]?.id ?? '',
                      amountInput: ''
                    }
                  ]);
                }}
              >
                + Add payer
              </button>
            </div>
          )}

          {payerComputation.invalid ? (
            <p className="text-xs text-red-400">{payerComputation.invalid}</p>
          ) : null}

          <PieCard
            title="Paid percentage (real-time)"
            currencySymbol={currencySymbol}
            slices={payerSlices}
            emptyLabel="No payer amounts yet."
          />
        </div>

        <div className="space-y-3 rounded-md border border-neutral-700 p-3">
          <p className="text-sm font-medium text-white">Choose split option</p>
          <div className="space-y-2">
            <label className="text-xs text-neutral-400">Split option</label>
            <select
              className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-black"
              value={splitOption}
              onChange={(event) =>
                setSplitOption(event.target.value as SplitOption)
              }
            >
              <option value={SplitOption.SPLIT_EXPENSE}>
                Split the expense
              </option>
              <option value={SplitOption.YOU_OWE_FULL}>
                You owe the full amount
              </option>
              <option value={SplitOption.THEY_OWE_FULL}>
                They owe the full amount
              </option>
            </select>
          </div>

          {splitOption === SplitOption.SPLIT_EXPENSE ? (
            <>
              <div className="space-y-2">
                <label className="text-xs text-neutral-400">
                  Split function
                </label>
                <select
                  className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-black"
                  value={splitType}
                  onChange={(event) =>
                    setSplitType(event.target.value as SplitType)
                  }
                >
                  <option value={SplitType.EQUAL}>
                    Split equally (default)
                  </option>
                  <option value={SplitType.CUSTOM_AMOUNT}>
                    Split by exact amounts
                  </option>
                  <option value={SplitType.PERCENTAGE}>
                    Split by percentages
                  </option>
                </select>
              </div>

              {splitType === SplitType.CUSTOM_AMOUNT
                ? activeMembers.map((member, index) => {
                    const isLast = index === activeMembers.length - 1;
                    const manualCustomMinor = activeMembers
                      .slice(0, Math.max(0, activeMembers.length - 1))
                      .reduce(
                        (sum, currentMember) =>
                          sum +
                          parseAmountToMinor(
                            customByMember[currentMember.id] ?? ''
                          ),
                        0
                      );
                    const suggestedCustomRemainderMinor = Math.max(
                      0,
                      amountMinor - manualCustomMinor
                    );
                    return (
                      <div key={member.id} className="space-y-1">
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">
                            {currencySymbol}
                          </span>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder={`${memberLabel(member)} amount`}
                            value={customByMember[member.id] ?? ''}
                            onChange={(event) => {
                              setCustomByMember((prev) => ({
                                ...prev,
                                [member.id]: sanitizeMoneyInput(
                                  event.target.value
                                )
                              }));
                            }}
                            onBlur={(event) => {
                              setCustomByMember((prev) => ({
                                ...prev,
                                [member.id]: roundMoneyInput(event.target.value)
                              }));
                            }}
                            className="pl-7"
                          />
                        </div>
                        {index === activeMembers.length - 1 ? (
                          <p className="text-xs text-neutral-400">
                            Auto-calculated remainder: {currencySymbol}
                            {formatMinorToAmount(suggestedCustomRemainderMinor)}
                          </p>
                        ) : null}
                      </div>
                    );
                  })
                : null}

              {splitType === SplitType.PERCENTAGE
                ? activeMembers.map((member, index) => {
                    const isLast = index === activeMembers.length - 1;
                    const manualPercentBps = activeMembers
                      .slice(0, Math.max(0, activeMembers.length - 1))
                      .reduce(
                        (sum, currentMember) =>
                          sum +
                          parsePercentToBps(
                            percentByMember[currentMember.id] ?? ''
                          ),
                        0
                      );
                    const suggestedPercentBps = Math.max(
                      0,
                      10_000 - manualPercentBps
                    );
                    return (
                      <div key={member.id} className="space-y-1">
                        <Input
                          type="number"
                          placeholder={`${memberLabel(member)} percentage`}
                          value={percentByMember[member.id] ?? ''}
                          onChange={(event) => {
                            setPercentByMember((prev) => ({
                              ...prev,
                              [member.id]: event.target.value
                            }));
                          }}
                          min={0}
                          max={100}
                          step="0.01"
                        />
                        {index === activeMembers.length - 1 ? (
                          <p className="text-xs text-neutral-400">
                            Auto-calculated remainder:{' '}
                            {((suggestedPercentBps || 0) / 100).toFixed(2)}%
                          </p>
                        ) : null}
                      </div>
                    );
                  })
                : null}
            </>
          ) : null}

          {owedComputation.invalid ? (
            <p className="text-xs text-red-400">{owedComputation.invalid}</p>
          ) : null}

          <PieCard
            title="Who needs to give (%)"
            currencySymbol={currencySymbol}
            slices={owedSlices}
            emptyLabel="No split amounts yet."
          />
        </div>
      </div>

      <div className="space-y-1 pt-3">
        <label htmlFor="expense-date" className="text-sm text-white">
          Expense date
        </label>
        <Input
          id="expense-date"
          type="date"
          value={expenseDateInput}
          onChange={(event) => setExpenseDateInput(event.target.value)}
          required
        />
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-neutral-700 pt-3">
        <Button
          type="button"
          onClick={() => onClose?.()}
          className="w-24 bg-black text-white hover:bg-neutral-900"
        >
          Close
        </Button>
        <Button type="submit" disabled={isSaving} className="w-24">
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
      {message ? (
        <p className="text-sm text-muted-foreground">{message}</p>
      ) : null}
    </form>
  );
}
