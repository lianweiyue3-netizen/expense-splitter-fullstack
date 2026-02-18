import { ReactNode } from 'react';
import { requireAuthSession } from '@/lib/auth';
import { Nav } from '@/components/nav';

export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireAuthSession();
  return (
    <main className="app-lowpoly-bg min-h-screen text-white">
      <div aria-hidden="true" className="app-lowpoly-layer" />
      <div className="relative z-10 mx-auto max-w-6xl p-4 md:p-8">
        <Nav />
        {children}
      </div>
    </main>
  );
}
