import Link from 'next/link';
import { redirect } from 'next/navigation';
import { EqualPayLogo } from '@/components/equalpay-logo';
import { getAuthSession } from '@/lib/auth';

export default async function HomePage() {
  const session = await getAuthSession();
  if (session?.user?.id) {
    redirect('/dashboard');
  }

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-black text-white"
      suppressHydrationWarning
    >
      <div
        className="absolute left-6 top-6 z-50 flex items-center gap-4"
        suppressHydrationWarning
      >
        <EqualPayLogo
          className="text-white"
          href="/"
          textClassName="text-3xl"
          reloadDocument
        />
        <div className="flex items-center gap-2" suppressHydrationWarning>
          <Link
            className="inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-neutral-200"
            href="/login"
          >
            Log in
          </Link>
          <Link
            className="inline-flex items-center rounded-md border border-white bg-transparent px-4 py-2 text-sm font-medium text-white transition hover:bg-white hover:text-black"
            href="/signup"
          >
            Sign up
          </Link>
        </div>
      </div>

      <section className="fade-in-hero mx-auto flex min-h-screen max-w-5xl cursor-default select-none flex-col items-center justify-center px-6 text-center">
        <p className="text-[clamp(2.2rem,5vw,4.5rem)] font-semibold uppercase leading-tight tracking-[0.12em]">
          Save smarter,
          <br />
          travel farther,
          <br />
          split fairly.
        </p>
        <p className="mt-6 max-w-2xl text-lg text-neutral-300">
          EqualPay keeps every trip transparent so your memories grow faster
          than your expenses.
        </p>
      </section>
    </main>
  );
}
