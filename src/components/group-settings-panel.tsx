'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  CurrencyOption,
  getClientCurrencyOptions,
  getInitialCurrencyOptions
} from '@/lib/currency-options';

type GroupMemberItem = {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'MEMBER';
};

type Props = {
  groupId: string;
  currentUserId: string;
  currentUserRole: 'OWNER' | 'MEMBER';
  initialGroupName: string;
  initialIconUrl: string;
  initialCurrencyCode: string;
  initialTripStartDate: string;
  initialTripEndDate: string | null;
  members: GroupMemberItem[];
  onClose?: () => void;
  onSaved?: () => void;
};

function buildGmailInviteUrl(email: string, inviteLink: string) {
  const subject = encodeURIComponent('Join my EqualPay group');
  const body = encodeURIComponent(
    `Join my EqualPay group with this invite link:\n\n${inviteLink}`
  );
  const to = encodeURIComponent(email);
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`;
}

export function GroupSettingsPanel({
  groupId,
  currentUserId,
  currentUserRole,
  initialGroupName,
  initialIconUrl,
  initialCurrencyCode,
  initialTripStartDate,
  initialTripEndDate,
  members,
  onClose,
  onSaved
}: Props) {
  const router = useRouter();
  const [groupName, setGroupName] = useState(initialGroupName);
  const [groupIconUrl, setGroupIconUrl] = useState(initialIconUrl);
  const [groupCurrencyCode, setGroupCurrencyCode] =
    useState(initialCurrencyCode);
  const [currencyOptions, setCurrencyOptions] = useState<CurrencyOption[]>(
    getInitialCurrencyOptions(initialCurrencyCode)
  );
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [tripStartDate, setTripStartDate] = useState(initialTripStartDate);
  const [tripEndDate, setTripEndDate] = useState(initialTripEndDate ?? '');
  const [memberEmail, setMemberEmail] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<
    'save' | 'add' | 'link' | 'gmail' | 'delete' | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const currencyBoxRef = useRef<HTMLDivElement | null>(null);
  const iconFileInputRef = useRef<HTMLInputElement | null>(null);

  const isOwner = currentUserRole === 'OWNER';
  const ownerCount = useMemo(
    () => members.filter((member) => member.role === 'OWNER').length,
    [members]
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!currencyBoxRef.current) {
        return;
      }
      if (!currencyBoxRef.current.contains(event.target as Node)) {
        setIsCurrencyOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setCurrencyOptions(getClientCurrencyOptions(initialCurrencyCode));
  }, [initialCurrencyCode]);

  const handleIconUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = event.target.files?.[0];
    if (!file) {
      input.value = '';
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      input.value = '';
      return;
    }
    if (file.size > 1_500_000) {
      setError('Image is too large. Please use an image smaller than 1.5MB');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setGroupIconUrl(reader.result);
        setError(null);
      }
      input.value = '';
    };
    reader.readAsDataURL(file);
  };

  async function createInvite(email?: string) {
    const response = await fetch(`/api/groups/${groupId}/invites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email || undefined })
    });
    const body = (await response.json()) as {
      inviteLink?: string;
      error?: string;
    };
    if (!response.ok || !body.inviteLink) {
      throw new Error(body.error ?? 'Could not create invite');
    }
    return body.inviteLink;
  }

  return (
    <Card className="space-y-5 border border-neutral-500 bg-[radial-gradient(circle_at_top_left,_#111111,_#000000_60%)] shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
      <h2 className="text-lg font-semibold text-white">Edit Group Settings</h2>

      {!isOwner ? (
        <p className="text-sm text-neutral-300">
          Only owners can change member settings or delete this group.
        </p>
      ) : null}

      <div className="space-y-3 rounded-md border border-neutral-500 p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
        <p className="text-sm font-medium text-white">Group details</p>
        <div className="space-y-2">
          <label className="text-xs text-neutral-300">Group icon</label>
          <div className="flex items-center gap-3">
            <img
              alt="Group icon preview"
              className="h-14 w-14 rounded-full border border-neutral-700 object-cover"
              src={groupIconUrl}
            />
            <button
              className="rounded-md border border-neutral-600 bg-white px-3 py-2 text-sm text-black hover:bg-neutral-100 disabled:opacity-60"
              type="button"
              disabled={!isOwner || busyAction !== null}
              onClick={() => {
                if (iconFileInputRef.current) {
                  iconFileInputRef.current.value = '';
                  iconFileInputRef.current.click();
                }
              }}
            >
              Upload image
            </button>
          </div>
          <input
            ref={iconFileInputRef}
            className="hidden"
            type="file"
            accept="image/*"
            onChange={handleIconUpload}
          />
        </div>
        <div className="space-y-2">
          <label
            className="text-xs text-neutral-300"
            htmlFor="group-name-input"
          >
            Group name
          </label>
          <Input
            id="group-name-input"
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            disabled={!isOwner || busyAction !== null}
          />
        </div>
        <div className="space-y-2">
          <label
            className="text-xs text-neutral-300"
            htmlFor="group-currency-input"
          >
            Group currency
          </label>
          <div className="relative" ref={currencyBoxRef}>
            <button
              id="group-currency-input"
              className="flex w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-left text-sm text-black disabled:opacity-60"
              type="button"
              onClick={() => setIsCurrencyOpen((prev) => !prev)}
              disabled={!isOwner || busyAction !== null}
              aria-expanded={isCurrencyOpen}
              aria-haspopup="listbox"
            >
              <span>
                {currencyOptions.find(
                  (option) => option.code === groupCurrencyCode
                )?.label ?? groupCurrencyCode}
              </span>
              <span className="text-xs text-neutral-500">▼</span>
            </button>
            {isCurrencyOpen ? (
              <ul
                className="absolute left-0 top-full z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-input bg-white py-1 text-sm text-black shadow-lg"
                role="listbox"
              >
                {currencyOptions.map((option) => (
                  <li key={option.code}>
                    <button
                      className="w-full px-3 py-2 text-left hover:bg-neutral-100"
                      type="button"
                      onClick={() => {
                        setGroupCurrencyCode(option.code);
                        setIsCurrencyOpen(false);
                      }}
                    >
                      {option.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <div className="space-y-2">
            <label
              className="text-xs text-neutral-300"
              htmlFor="trip-start-date-input"
            >
              Trip start date
            </label>
            <Input
              id="trip-start-date-input"
              type="date"
              value={tripStartDate}
              onChange={(event) => setTripStartDate(event.target.value)}
              disabled={!isOwner || busyAction !== null}
            />
          </div>
          <div className="space-y-2">
            <label
              className="text-xs text-neutral-300"
              htmlFor="trip-end-date-input"
            >
              Trip end date (optional)
            </label>
            <Input
              id="trip-end-date-input"
              type="date"
              value={tripEndDate}
              onChange={(event) => setTripEndDate(event.target.value)}
              disabled={!isOwner || busyAction !== null}
            />
          </div>
        </div>
        <button
          className="rounded-md bg-neutral-600 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-500 disabled:opacity-60"
          type="button"
          disabled={!isOwner || busyAction !== null}
          onClick={async () => {
            try {
              setBusyAction('save');
              setError(null);
              setSuccess(null);
              if (tripEndDate && tripEndDate < tripStartDate) {
                throw new Error('Trip end date is invalid');
              }

              const response = await fetch(`/api/groups/${groupId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: groupName,
                  iconUrl: groupIconUrl,
                  baseCurrencyCode: groupCurrencyCode,
                  tripStartDate,
                  tripEndDate: tripEndDate || null
                })
              });

              const body = (await response.json()) as { error?: string };
              if (!response.ok) {
                throw new Error(body.error ?? 'Could not save group settings');
              }

              setSuccess('Group settings saved.');
              onSaved?.();
              router.refresh();
            } catch (requestError) {
              setError(
                requestError instanceof Error
                  ? requestError.message
                  : 'Could not save group settings'
              );
            } finally {
              setBusyAction(null);
            }
          }}
        >
          Save
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-white">Add group member</p>
        <div className="flex flex-wrap gap-2">
          <Input
            className="max-w-sm"
            type="email"
            placeholder="member@email.com"
            value={memberEmail}
            onChange={(event) => setMemberEmail(event.target.value)}
            disabled={!isOwner || busyAction !== null}
          />
          <button
            className="rounded-md border border-neutral-600 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
            type="button"
            disabled={!isOwner || !memberEmail || busyAction !== null}
            onClick={async () => {
              try {
                setBusyAction('add');
                setError(null);
                setSuccess(null);
                const response = await fetch(`/api/groups/${groupId}/members`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: memberEmail })
                });
                const body = (await response.json()) as { error?: string };
                if (!response.ok) {
                  throw new Error(body.error ?? 'Could not add member');
                }
                setSuccess('Member added successfully.');
                setMemberEmail('');
                router.refresh();
              } catch (requestError) {
                setError(
                  requestError instanceof Error
                    ? requestError.message
                    : 'Could not add member'
                );
              } finally {
                setBusyAction(null);
              }
            }}
          >
            Add member
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-white">Group members</p>
        <ul className="space-y-2">
          {members.map((member) => {
            const isOnlyOwner = member.role === 'OWNER' && ownerCount <= 1;
            const canRemove = isOwner && !(isOnlyOwner || members.length <= 1);
            const selfLabel = member.id === currentUserId ? ' (You)' : '';

            return (
              <li
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-800 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {member.name}
                    {selfLabel}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {member.email} - {member.role}
                  </p>
                </div>
                <button
                  className="rounded-md border border-red-500/50 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-950 disabled:opacity-40"
                  type="button"
                  disabled={!canRemove || busyAction !== null}
                  onClick={async () => {
                    try {
                      setBusyAction('delete');
                      setError(null);
                      setSuccess(null);
                      const response = await fetch(
                        `/api/groups/${groupId}/members/${member.id}`,
                        {
                          method: 'DELETE'
                        }
                      );
                      const body = (await response.json()) as {
                        error?: string;
                      };
                      if (!response.ok) {
                        throw new Error(
                          body.error ?? 'Could not remove member'
                        );
                      }
                      setSuccess('Member removed.');
                      router.refresh();
                    } catch (requestError) {
                      setError(
                        requestError instanceof Error
                          ? requestError.message
                          : 'Could not remove member'
                      );
                    } finally {
                      setBusyAction(null);
                    }
                  }}
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-white">Invite people</p>
        <div className="flex flex-wrap gap-2">
          <Input
            className="max-w-sm"
            type="email"
            placeholder="Optional email for invite"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            disabled={busyAction !== null}
          />
          <button
            className="rounded-md border border-neutral-600 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
            type="button"
            disabled={busyAction !== null}
            onClick={async () => {
              try {
                setBusyAction('link');
                setError(null);
                setSuccess(null);
                const link = await createInvite(inviteEmail || undefined);
                setInviteLink(link);
                setSuccess('Invite link created.');
              } catch (requestError) {
                setError(
                  requestError instanceof Error
                    ? requestError.message
                    : 'Could not create invite'
                );
              } finally {
                setBusyAction(null);
              }
            }}
          >
            Create invite link
          </button>
          <button
            className="rounded-md border border-emerald-500/60 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-950 disabled:opacity-60"
            type="button"
            disabled={busyAction !== null || !inviteEmail}
            onClick={async () => {
              try {
                setBusyAction('gmail');
                setError(null);
                setSuccess(null);
                const link = await createInvite(inviteEmail);
                setInviteLink(link);
                window.open(
                  buildGmailInviteUrl(inviteEmail, link),
                  '_blank',
                  'noopener,noreferrer'
                );
                setSuccess('Gmail invite opened in a new tab.');
              } catch (requestError) {
                setError(
                  requestError instanceof Error
                    ? requestError.message
                    : 'Could not open Gmail invite'
                );
              } finally {
                setBusyAction(null);
              }
            }}
          >
            Invite via Gmail
          </button>
        </div>
        {inviteLink ? (
          <p className="break-all text-sm text-emerald-300">{inviteLink}</p>
        ) : null}
      </div>

      <div className="space-y-2 border-t border-neutral-800 pt-4">
        <p className="text-sm font-medium text-white">Danger zone</p>
        <button
          className="rounded-md border border-red-600/70 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-950 disabled:opacity-40"
          type="button"
          disabled={!isOwner || busyAction !== null}
          onClick={async () => {
            const confirmed = window.confirm(
              'Delete this group permanently? This cannot be undone.'
            );
            if (!confirmed) {
              return;
            }

            try {
              setBusyAction('delete');
              setError(null);
              setSuccess(null);
              const response = await fetch(`/api/groups/${groupId}`, {
                method: 'DELETE'
              });
              const body = (await response.json()) as { error?: string };
              if (!response.ok) {
                throw new Error(body.error ?? 'Could not delete group');
              }
              router.push('/dashboard');
            } catch (requestError) {
              setError(
                requestError instanceof Error
                  ? requestError.message
                  : 'Could not delete group'
              );
            } finally {
              setBusyAction(null);
            }
          }}
        >
          Delete group
        </button>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-300">{success}</p> : null}
      <div className="flex justify-end pt-2">
        <button
          className="rounded-md border border-neutral-500 px-4 py-2 text-sm font-semibold text-neutral-200 hover:bg-neutral-800 disabled:opacity-50"
          type="button"
          disabled={busyAction !== null}
          onClick={() => onClose?.()}
        >
          Close
        </button>
      </div>
    </Card>
  );
}
