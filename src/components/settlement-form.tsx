'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Member = {
  id: string;
  name: string;
};

type Props = {
  groupId: string;
  members: Member[];
  defaultCurrencyCode: string;
  editDraft?: SettlementEditDraft | null;
  onSaved?: () => void;
  onClose?: () => void;
};

export type SettlementEditDraft = {
  mode: 'EDIT';
  settlementId: string;
  payerId: string;
  receiverId: string;
  amountMinor: number;
  note?: string | null;
  settledAtIso?: string;
};

function formatMinorToAmount(valueMinor: number): string {
  if (Math.abs(valueMinor % 100) === 0) {
    return String(valueMinor / 100);
  }
  return (valueMinor / 100).toFixed(2);
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
  const date = new Date(y, m - 1, d, 12, 0, 0, 0);
  return date.toISOString();
}

export function SettlementForm({
  groupId,
  members,
  defaultCurrencyCode,
  editDraft,
  onSaved,
  onClose
}: Props) {
  const router = useRouter();
  const [payerId, setPayerId] = useState(members[0]?.id ?? '');
  const [receiverId, setReceiverId] = useState(
    members[1]?.id ?? members[0]?.id ?? ''
  );
  const [amountInput, setAmountInput] = useState('');
  const [settledDateInput, setSettledDateInput] = useState(
    isoToDateInput(null)
  );
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [settlementId, setSettlementId] = useState<string | null>(null);

  const currencySymbol = (() => {
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
  })();

  const parseAmountToMinor = (value: string): number => {
    const numeric = Number(value || 0);
    if (!Number.isFinite(numeric) || numeric < 0) {
      return 0;
    }
    return Math.round(numeric * 100);
  };

  const sanitizeMoneyInput = (value: string): string => {
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
  };

  useEffect(() => {
    if (!editDraft || editDraft.mode !== 'EDIT') {
      return;
    }
    setIsEditMode(true);
    setSettlementId(editDraft.settlementId);
    setPayerId(editDraft.payerId);
    setReceiverId(editDraft.receiverId);
    setAmountInput(formatMinorToAmount(editDraft.amountMinor));
    setNote(editDraft.note ?? '');
    setSettledDateInput(isoToDateInput(editDraft.settledAtIso ?? null));
  }, [editDraft]);

  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        if (isSaving) {
          return;
        }
        setMessage(null);
        setIsSaving(true);
        const amountMinor = parseAmountToMinor(amountInput);
        if (amountMinor <= 0) {
          setMessage('Please enter a valid amount.');
          setIsSaving(false);
          return;
        }
        if (isEditMode && !settlementId) {
          setMessage('Edit context missing. Please click edit again.');
          setIsSaving(false);
          return;
        }

        const response = await fetch(
          isEditMode
            ? `/api/groups/${groupId}/settlements/${settlementId}`
            : `/api/groups/${groupId}/settlements`,
          {
            method: isEditMode ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              payerId,
              receiverId,
              amountMinor,
              currencyCode: defaultCurrencyCode,
              settledAt: dateInputToIso(settledDateInput),
              note: note || undefined
            })
          }
        );

        const body = (await response.json()) as { error?: string };
        if (response.ok) {
          setMessage(isEditMode ? 'Settlement updated' : 'Settlement recorded');
          setAmountInput('');
          setNote('');
          router.refresh();
          onSaved?.();
        } else {
          setMessage(body.error ?? 'Could not record settlement');
        }
        setIsSaving(false);
      }}
    >
      <select
        className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-black"
        value={payerId}
        onChange={(event) => setPayerId(event.target.value)}
      >
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            Payer: {member.name}
          </option>
        ))}
      </select>
      <select
        className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-black"
        value={receiverId}
        onChange={(event) => setReceiverId(event.target.value)}
      >
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            Receiver: {member.name}
          </option>
        ))}
      </select>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
          {currencySymbol}
        </span>
        <Input
          type="text"
          inputMode="decimal"
          placeholder="Amount"
          value={amountInput}
          onChange={(event) =>
            setAmountInput(sanitizeMoneyInput(event.target.value))
          }
          className="pl-10"
          required
        />
      </div>
      <Input
        id="settled-date"
        type="date"
        value={settledDateInput}
        onChange={(event) => setSettledDateInput(event.target.value)}
        required
      />
      <Input
        placeholder="Note"
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <div className="flex items-center justify-end gap-2">
        {onClose ? (
          <Button
            type="button"
            onClick={() => onClose()}
            className="w-24 bg-black text-white hover:bg-neutral-900"
          >
            Close
          </Button>
        ) : null}
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
