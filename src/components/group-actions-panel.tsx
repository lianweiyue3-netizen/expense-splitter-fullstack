'use client';

import { useEffect, useState } from 'react';
import { ExpenseForm } from '@/components/expense-form';
import type { ExpenseEditDraft } from '@/components/expense-form';
import { GroupSettingsPanel } from '@/components/group-settings-panel';
import { SettlementForm } from '@/components/settlement-form';
import type { SettlementEditDraft } from '@/components/settlement-form';
import { Card } from '@/components/ui/card';

type Member = {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'MEMBER';
};

type Props = {
  groupId: string;
  currentUserId: string;
  currentUserRole: 'OWNER' | 'MEMBER';
  groupName: string;
  groupIconUrl: string;
  groupCurrencyCode: string;
  tripStartDate: string;
  tripEndDate: string | null;
  members: Member[];
  defaultCurrencyCode: string;
};

export function GroupActionsPanel({
  groupId,
  currentUserId,
  currentUserRole,
  groupName,
  groupIconUrl,
  groupCurrencyCode,
  tripStartDate,
  tripEndDate,
  members,
  defaultCurrencyCode
}: Props) {
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showEditExpenseForm, setShowEditExpenseForm] = useState(false);
  const [showSettlementForm, setShowSettlementForm] = useState(false);
  const [showEditSettlementForm, setShowEditSettlementForm] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [editDraft, setEditDraft] = useState<ExpenseEditDraft | null>(null);
  const [editFormVersion, setEditFormVersion] = useState(0);
  const [settlementEditDraft, setSettlementEditDraft] =
    useState<SettlementEditDraft | null>(null);
  const [settlementEditFormVersion, setSettlementEditFormVersion] = useState(0);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<ExpenseEditDraft>;
      if (!customEvent.detail) {
        return;
      }
      setEditDraft(customEvent.detail);
      setEditFormVersion((prev) => prev + 1);
      setShowEditExpenseForm(true);
      setShowExpenseForm(false);
      setShowSettlementForm(false);
      setShowGroupSettings(false);
    };
    window.addEventListener('expense-edit-draft', handler);
    return () => window.removeEventListener('expense-edit-draft', handler);
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<SettlementEditDraft>;
      if (!customEvent.detail) {
        return;
      }
      setSettlementEditDraft(customEvent.detail);
      setSettlementEditFormVersion((prev) => prev + 1);
      setShowEditSettlementForm(true);
      setShowSettlementForm(false);
      setShowExpenseForm(false);
      setShowEditExpenseForm(false);
      setShowGroupSettings(false);
    };
    window.addEventListener('settlement-edit-draft', handler);
    return () => window.removeEventListener('settlement-edit-draft', handler);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          className="rounded-md bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-400"
          type="button"
          onClick={() => {
            setShowExpenseForm((prev) => !prev);
            setShowEditExpenseForm(false);
            setEditDraft(null);
            setShowEditSettlementForm(false);
            setSettlementEditDraft(null);
            if (showSettlementForm) {
              setShowSettlementForm(false);
            }
            if (showGroupSettings) {
              setShowGroupSettings(false);
            }
          }}
        >
          Add an expense
        </button>
        <button
          className="rounded-md bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400"
          type="button"
          onClick={() => {
            setShowSettlementForm((prev) => !prev);
            setShowEditSettlementForm(false);
            setSettlementEditDraft(null);
            if (showExpenseForm) {
              setShowExpenseForm(false);
            }
            if (showGroupSettings) {
              setShowGroupSettings(false);
            }
          }}
        >
          Settle up
        </button>
        <button
          className="rounded-md bg-neutral-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-500"
          type="button"
          onClick={() => {
            setShowGroupSettings((prev) => !prev);
            if (showExpenseForm) {
              setShowExpenseForm(false);
            }
            if (showSettlementForm) {
              setShowSettlementForm(false);
            }
            if (showEditSettlementForm) {
              setShowEditSettlementForm(false);
              setSettlementEditDraft(null);
            }
          }}
        >
          Edit group settings
        </button>
      </div>

      {showExpenseForm ? (
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold">Add expense</h2>
          <ExpenseForm
            groupId={groupId}
            members={members}
            defaultCurrencyCode={defaultCurrencyCode}
            currentUserId={currentUserId}
            onSaved={() => {
              setShowExpenseForm(false);
            }}
            onClose={() => setShowExpenseForm(false)}
          />
        </Card>
      ) : null}

      {showEditExpenseForm && editDraft ? (
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold">Edit expense</h2>
          <ExpenseForm
            key={`edit-expense-${editFormVersion}`}
            groupId={groupId}
            members={members}
            defaultCurrencyCode={defaultCurrencyCode}
            currentUserId={currentUserId}
            editDraft={editDraft}
            onSaved={() => {
              setShowEditExpenseForm(false);
              setEditDraft(null);
            }}
            onClose={() => {
              setShowEditExpenseForm(false);
              setEditDraft(null);
            }}
          />
        </Card>
      ) : null}

      {showSettlementForm ? (
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold">Settle up</h2>
          <SettlementForm
            groupId={groupId}
            members={members}
            defaultCurrencyCode={defaultCurrencyCode}
            onSaved={() => {
              setShowSettlementForm(false);
            }}
            onClose={() => {
              setShowSettlementForm(false);
            }}
          />
        </Card>
      ) : null}

      {showEditSettlementForm && settlementEditDraft ? (
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold">Edit settlement</h2>
          <SettlementForm
            key={`edit-settlement-${settlementEditFormVersion}`}
            groupId={groupId}
            members={members}
            defaultCurrencyCode={defaultCurrencyCode}
            editDraft={settlementEditDraft}
            onSaved={() => {
              setShowEditSettlementForm(false);
              setSettlementEditDraft(null);
            }}
            onClose={() => {
              setShowEditSettlementForm(false);
              setSettlementEditDraft(null);
            }}
          />
        </Card>
      ) : null}

      {showGroupSettings ? (
        <GroupSettingsPanel
          groupId={groupId}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          initialGroupName={groupName}
          initialIconUrl={groupIconUrl}
          initialCurrencyCode={groupCurrencyCode}
          initialTripStartDate={tripStartDate}
          initialTripEndDate={tripEndDate}
          members={members}
          onClose={() => {
            setShowGroupSettings(false);
          }}
          onSaved={() => {
            setShowGroupSettings(false);
          }}
        />
      ) : null}
    </div>
  );
}
