'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { EqualPayLogo } from '@/components/equalpay-logo';
import { Button } from '@/components/ui/button';

export function Nav() {
  return (
    <nav className="mb-8 flex items-center justify-between border-b border-neutral-800 py-4">
      <EqualPayLogo className="text-white" href="/" />
      <div className="flex gap-2">
        <Link
          href="/dashboard"
          className="rounded-md px-3 py-2 text-white hover:bg-neutral-900"
        >
          Dashboard
        </Link>
        <Link
          href="/settings"
          className="rounded-md px-3 py-2 text-white hover:bg-neutral-900"
        >
          Settings
        </Link>
        <Button
          variant="ghost"
          className="text-white hover:bg-neutral-900"
          type="button"
          onClick={() => {
            void signOut({ callbackUrl: '/login' });
          }}
        >
          Sign out
        </Button>
      </div>
    </nav>
  );
}
