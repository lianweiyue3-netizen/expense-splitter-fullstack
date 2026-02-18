'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function InviteAcceptPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);

  return (
    <main className="mx-auto max-w-lg">
      <Card className="space-y-3">
        <h1 className="text-2xl font-semibold">Accept Invite</h1>
        <p className="text-sm text-muted-foreground">
          Join this group using your invite token.
        </p>
        <Button
          type="button"
          onClick={async () => {
            const response = await fetch(
              `/api/invites/${params.token}/accept`,
              { method: 'POST' }
            );
            const body = (await response.json()) as {
              groupId?: string;
              error?: string;
            };
            if (!response.ok || !body.groupId) {
              setStatus(body.error ?? 'Could not accept invite');
              return;
            }
            router.push(`/groups/${body.groupId}`);
          }}
        >
          Accept Invite
        </Button>
        {status ? <p className="text-sm text-red-600">{status}</p> : null}
      </Card>
    </main>
  );
}
