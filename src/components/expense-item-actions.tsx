'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ExpenseEditDraft } from '@/components/expense-form';

type Props = {
  groupId: string;
  expenseIds: string[];
  editDraft: ExpenseEditDraft;
};

export function ExpenseItemActions({ groupId, expenseIds, editDraft }: Props) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        title="Edit expense"
        aria-label="Edit expense"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-neutral-300 text-neutral-600 transition hover:bg-neutral-100"
        onClick={() => {
          window.dispatchEvent(
            new CustomEvent('expense-edit-draft', {
              detail: editDraft
            })
          );
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </button>

      <button
        type="button"
        title="Remove expense"
        aria-label="Remove expense"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-300 text-rose-600 transition hover:bg-rose-50 disabled:opacity-40"
        disabled={isDeleting}
        onClick={async () => {
          const shouldDelete = window.confirm(
            'Are you sure you want to delete this expense?'
          );
          if (!shouldDelete) {
            return;
          }
          setIsDeleting(true);
          const response = await fetch(`/api/groups/${groupId}/expenses/bulk`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ expenseIds })
          });
          setIsDeleting(false);
          if (response.ok) {
            router.refresh();
          }
        }}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      </button>
    </div>
  );
}
