'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function InviteForm({ groupId }: { groupId: string }) {
  const [email, setEmail] = useState('');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setInviteLink(null);

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
          setError(body.error ?? 'Could not create invite');
          return;
        }
        setInviteLink(body.inviteLink);
      }}
    >
      <Input
        type="email"
        placeholder="Optional email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <Button type="submit">Create Invite Link</Button>
      {inviteLink ? (
        <p className="break-all text-sm text-primary">{inviteLink}</p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </form>
  );
}
